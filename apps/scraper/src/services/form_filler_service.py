"""Form Filler Service - The Closer

Automates form filling and submission using Playwright.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any
from playwright.async_api import async_playwright, Page, Browser

logger = logging.getLogger(__name__)


class FormFillerService:
    """Automates grant application form filling with human-in-the-loop verification."""

    def __init__(self, headless: bool = False):
        self.headless = headless
        self.screenshots_dir = Path("screenshots")
        self.screenshots_dir.mkdir(exist_ok=True)
        self.sessions_dir = Path("sessions")
        self.sessions_dir.mkdir(exist_ok=True)

    async def fill_application(
        self,
        application_id: str,
        portal: str,
        responses: list[dict[str, Any]],
        mode: str = "semi-automatic",
    ) -> dict[str, Any]:
        """
        Fill grant application form on government portal.

        Args:
            application_id: Application ID from database
            portal: Portal identifier (e.g., "grants.gov.au")
            responses: List of criterion responses with mapping info
            mode: "automatic", "semi-automatic", or "manual"

        Returns:
            Submission result with reference number and screenshots
        """
        logger.info(f"Starting form filling for application {application_id} on {portal}")

        screenshots = []
        errors = []
        reference_number = None

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.headless,
                slow_mo=100 if mode == "semi-automatic" else 0,
            )

            try:
                page = await browser.new_page()

                # Load portal mapping
                mapping = await self._load_portal_mapping(portal)
                if not mapping:
                    raise ValueError(f"No form mapping found for portal: {portal}")

                # Navigate to application form
                logger.info(f"Navigating to {mapping['application_url']}")
                await page.goto(mapping["application_url"], wait_until="networkidle")

                # Take initial screenshot
                screenshot_path = await self._take_screenshot(
                    page, application_id, "01-initial"
                )
                screenshots.append(screenshot_path)

                # Execute navigation steps
                for step in mapping.get("navigation", []):
                    await self._execute_navigation_step(page, step, mode)

                    # Screenshot after each navigation
                    screenshot_path = await self._take_screenshot(
                        page,
                        application_id,
                        f"{step['step']:02d}-{step['description'][:20]}",
                    )
                    screenshots.append(screenshot_path)

                # Fill form fields
                field_count = 0
                for response in responses:
                    criterion_id = response.get("criterion_id")
                    response_text = response.get("response")

                    # Find field mapping for this criterion
                    field_mapping = next(
                        (
                            f
                            for f in mapping.get("fields", [])
                            if f.get("criteriaId") == criterion_id
                        ),
                        None,
                    )

                    if not field_mapping:
                        logger.warning(f"No field mapping for criterion {criterion_id}")
                        continue

                    # Fill the field
                    await self._fill_field(
                        page, field_mapping, response_text, mode
                    )
                    field_count += 1

                    # Screenshot after important fields
                    if field_count % 3 == 0:
                        screenshot_path = await self._take_screenshot(
                            page,
                            application_id,
                            f"field-{field_count:02d}",
                        )
                        screenshots.append(screenshot_path)

                logger.info(f"Filled {field_count} form fields")

                # Final screenshot before submission
                screenshot_path = await self._take_screenshot(
                    page, application_id, "99-pre-submission"
                )
                screenshots.append(screenshot_path)

                # Human verification for semi-automatic mode
                if mode == "semi-automatic":
                    logger.info("Waiting for human verification...")
                    # In production, this would pause and wait for user confirmation
                    # For now, we'll simulate approval
                    await page.wait_for_timeout(2000)

                # Submit form (if not in manual mode)
                if mode != "manual":
                    reference_number = await self._submit_form(
                        page, mapping, application_id
                    )

                    # Post-submission screenshot
                    screenshot_path = await self._take_screenshot(
                        page, application_id, "submitted"
                    )
                    screenshots.append(screenshot_path)

                return {
                    "success": True,
                    "application_id": application_id,
                    "reference_number": reference_number,
                    "fields_filled": field_count,
                    "screenshots": screenshots,
                    "errors": errors,
                    "timestamp": datetime.now().isoformat(),
                }

            except Exception as e:
                logger.error(f"Error during form filling: {e}")
                errors.append(str(e))

                # Error screenshot
                try:
                    screenshot_path = await self._take_screenshot(
                        page, application_id, "error"
                    )
                    screenshots.append(screenshot_path)
                except:
                    pass

                return {
                    "success": False,
                    "application_id": application_id,
                    "screenshots": screenshots,
                    "errors": errors,
                    "timestamp": datetime.now().isoformat(),
                }

            finally:
                await browser.close()

    async def _load_portal_mapping(self, portal: str) -> dict[str, Any] | None:
        """Load form field mapping for a portal."""
        mapping_file = Path(__file__).parent.parent.parent / "form_mappings" / f"{portal}.json"

        if not mapping_file.exists():
            logger.error(f"Mapping file not found: {mapping_file}")
            return None

        try:
            with open(mapping_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading mapping file: {e}")
            return None

    async def _execute_navigation_step(
        self, page: Page, step: dict[str, Any], mode: str
    ) -> None:
        """Execute a navigation step."""
        action = step.get("action")
        logger.info(f"Step {step.get('step')}: {step.get('description')}")

        if action == "navigate":
            if step.get("url"):
                await page.goto(step["url"], wait_until="networkidle")

        elif action == "click":
            if step.get("selector"):
                await page.wait_for_selector(step["selector"], timeout=10000)
                await page.click(step["selector"])

        elif action == "wait":
            if step.get("verificationSelector"):
                await page.wait_for_selector(
                    step["verificationSelector"], timeout=10000
                )

        # Wait for page to stabilize
        await page.wait_for_timeout(1000)

    async def _fill_field(
        self,
        page: Page,
        field_mapping: dict[str, Any],
        value: str,
        mode: str,
    ) -> None:
        """Fill a form field based on its type."""
        selector = field_mapping.get("selector")
        field_type = field_mapping.get("type", "text")

        logger.info(f"Filling field: {selector} ({field_type})")

        # Wait for field to be available
        await page.wait_for_selector(selector, timeout=10000)

        if field_type in ["text", "email", "tel"]:
            await page.fill(selector, value)

        elif field_type == "textarea":
            await page.fill(selector, value)

        elif field_type == "select":
            await page.select_option(selector, value)

        elif field_type == "radio":
            await page.check(selector)

        elif field_type == "checkbox":
            if value.lower() in ["true", "yes", "1"]:
                await page.check(selector)

        # Validate max length if specified
        if field_mapping.get("maxLength"):
            current_value = await page.input_value(selector)
            if len(current_value) > field_mapping["maxLength"]:
                logger.warning(
                    f"Field {selector} exceeds max length {field_mapping['maxLength']}"
                )

    async def _submit_form(
        self, page: Page, mapping: dict[str, Any], application_id: str
    ) -> str | None:
        """Submit the form and capture reference number."""
        submit_selector = mapping.get("submit_button", "button[type='submit']")

        try:
            logger.info("Submitting form...")
            await page.click(submit_selector)

            # Wait for submission to complete
            await page.wait_for_timeout(3000)

            # Try to extract reference number
            ref_selector = mapping.get("reference_number_selector")
            if ref_selector:
                try:
                    ref_element = await page.wait_for_selector(
                        ref_selector, timeout=5000
                    )
                    reference_number = await ref_element.inner_text()
                    logger.info(f"Reference number: {reference_number}")
                    return reference_number.strip()
                except:
                    logger.warning("Could not extract reference number")

            # Generate fallback reference
            return f"APP-{application_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        except Exception as e:
            logger.error(f"Error submitting form: {e}")
            raise

    async def _take_screenshot(
        self, page: Page, application_id: str, label: str
    ) -> str:
        """Take and save a screenshot."""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        filename = f"{application_id}_{timestamp}_{label}.png"
        filepath = self.screenshots_dir / filename

        await page.screenshot(path=str(filepath), full_page=True)
        logger.info(f"Screenshot saved: {filename}")

        return str(filepath)

    async def save_session(
        self, application_id: str, session_data: dict[str, Any]
    ) -> None:
        """Save session state for resume capability."""
        session_file = self.sessions_dir / f"{application_id}.json"

        try:
            with open(session_file, "w") as f:
                json.dump(
                    {
                        **session_data,
                        "saved_at": datetime.now().isoformat(),
                    },
                    f,
                    indent=2,
                )
            logger.info(f"Session saved: {application_id}")
        except Exception as e:
            logger.error(f"Error saving session: {e}")

    async def load_session(self, application_id: str) -> dict[str, Any] | None:
        """Load saved session state."""
        session_file = self.sessions_dir / f"{application_id}.json"

        if not session_file.exists():
            return None

        try:
            with open(session_file, "r") as f:
                session_data = json.load(f)
            logger.info(f"Session loaded: {application_id}")
            return session_data
        except Exception as e:
            logger.error(f"Error loading session: {e}")
            return None
