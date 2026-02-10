"""Scrapers for Federal government portals."""

import logging
from datetime import datetime
from typing import Any
from playwright.async_api import async_playwright, Page, Browser
from .base import BaseScraper

logger = logging.getLogger(__name__)


class GrantConnectScraper(BaseScraper):
    """Scraper for grants.gov.au (GrantConnect)."""

    def __init__(self):
        super().__init__("https://www.grants.gov.au")
        self.search_url = f"{self.portal_url}/grants"

    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape GrantConnect portal for open grants."""
        grants = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                logger.info(f"Starting GrantConnect scrape: {self.search_url}")
                await page.goto(self.search_url, wait_until="networkidle")

                # Wait for grants listing to load
                await page.wait_for_selector(".grant-listing", timeout=10000)

                # Get all grant cards
                grant_cards = await page.locator(".grant-card").all()
                logger.info(f"Found {len(grant_cards)} grant listings")

                for card in grant_cards:
                    try:
                        grant_data = await self._extract_grant_from_card(card, page)
                        if grant_data:
                            grants.append(grant_data)
                    except Exception as e:
                        logger.error(f"Error extracting grant card: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping GrantConnect: {e}")
            finally:
                await browser.close()

        logger.info(f"Scraped {len(grants)} grants from GrantConnect")
        return grants

    async def _extract_grant_from_card(
        self, card: Any, page: Page
    ) -> dict[str, Any] | None:
        """Extract grant information from a grant card element."""
        try:
            # Extract basic information from card
            title_elem = await card.locator(".grant-title").first
            title = await title_elem.inner_text() if title_elem else "Unknown"

            link_elem = await card.locator("a").first
            href = await link_elem.get_attribute("href") if link_elem else None
            grant_url = f"{self.portal_url}{href}" if href else None

            # Extract metadata
            department_elem = await card.locator(".department").first
            department = (
                await department_elem.inner_text() if department_elem else "Unknown"
            )

            closing_date_elem = await card.locator(".closing-date").first
            closing_date_text = (
                await closing_date_elem.inner_text() if closing_date_elem else None
            )

            funding_elem = await card.locator(".funding-amount").first
            funding_text = await funding_elem.inner_text() if funding_elem else None

            # Parse dates and funding
            closing_date = self._parse_date(closing_date_text)
            funding_min, funding_max = self._parse_funding(funding_text)

            grant_data = {
                "external_id": href.split("/")[-1] if href else None,
                "title": title.strip(),
                "url": grant_url,
                "portal": "grants.gov.au",
                "level": "Federal",
                "department": department.strip(),
                "closing_date": closing_date,
                "funding_min": funding_min,
                "funding_max": funding_max,
                "status": "open",
            }

            # If we have a detail URL, fetch additional information
            if grant_url:
                detail_data = await self._fetch_grant_details(page, grant_url)
                grant_data.update(detail_data)

            return grant_data

        except Exception as e:
            logger.error(f"Error extracting grant card data: {e}")
            return None

    async def _fetch_grant_details(
        self, page: Page, grant_url: str
    ) -> dict[str, Any]:
        """Fetch detailed grant information from the grant detail page."""
        try:
            await page.goto(grant_url, wait_until="networkidle")

            # Extract detailed information
            description_elem = await page.locator(".grant-description").first
            description = (
                await description_elem.inner_text() if description_elem else ""
            )

            guidelines_elem = await page.locator(".grant-guidelines").first
            guidelines = await guidelines_elem.inner_text() if guidelines_elem else ""

            eligibility_elem = await page.locator(".eligibility-criteria").first
            eligibility = (
                await eligibility_elem.inner_text() if eligibility_elem else ""
            )

            category_elem = await page.locator(".grant-category").first
            category = await category_elem.inner_text() if category_elem else "General"

            opening_date_elem = await page.locator(".opening-date").first
            opening_date_text = (
                await opening_date_elem.inner_text() if opening_date_elem else None
            )

            return {
                "description": description.strip(),
                "guidelines": guidelines.strip(),
                "eligibility": eligibility.strip(),
                "category": category.strip(),
                "opening_date": self._parse_date(opening_date_text),
            }

        except Exception as e:
            logger.error(f"Error fetching grant details from {grant_url}: {e}")
            return {}

    async def parse_grant(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse GrantConnect grant data into standardized format."""
        # The scraper already returns standardized data
        # This method is for any additional parsing or validation
        return raw_data

    def _parse_date(self, date_text: str | None) -> datetime | None:
        """Parse date string to datetime object."""
        if not date_text:
            return None

        try:
            # Try common Australian date formats
            formats = [
                "%d/%m/%Y",
                "%d-%m-%Y",
                "%d %B %Y",
                "%d %b %Y",
                "%Y-%m-%d",
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(date_text.strip(), fmt)
                except ValueError:
                    continue

            logger.warning(f"Could not parse date: {date_text}")
            return None

        except Exception as e:
            logger.error(f"Error parsing date '{date_text}': {e}")
            return None

    def _parse_funding(self, funding_text: str | None) -> tuple[int | None, int | None]:
        """Parse funding amount text to min/max integers."""
        if not funding_text:
            return None, None

        try:
            # Remove currency symbols and commas
            cleaned = funding_text.replace("$", "").replace(",", "").strip()

            # Handle ranges like "$10,000 - $50,000"
            if "-" in cleaned or "to" in cleaned.lower():
                parts = cleaned.replace("to", "-").split("-")
                min_val = int(parts[0].strip()) if len(parts) > 0 else None
                max_val = int(parts[1].strip()) if len(parts) > 1 else None
                return min_val, max_val

            # Single amount
            amount = int(cleaned)
            return amount, amount

        except Exception as e:
            logger.error(f"Error parsing funding '{funding_text}': {e}")
            return None, None


class AusTenderScraper(BaseScraper):
    """Scraper for tenders.gov.au (AusTender)."""

    def __init__(self):
        super().__init__("https://www.tenders.gov.au")
        self.search_url = f"{self.portal_url}/search"

    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape AusTender portal for open tenders."""
        tenders = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                logger.info(f"Starting AusTender scrape: {self.search_url}")
                await page.goto(self.search_url, wait_until="networkidle")

                # Wait for tender listings to load
                await page.wait_for_selector(".tender-listing", timeout=10000)

                # Get all tender cards
                tender_cards = await page.locator(".tender-card").all()
                logger.info(f"Found {len(tender_cards)} tender listings")

                for card in tender_cards:
                    try:
                        tender_data = await self._extract_tender_from_card(card, page)
                        if tender_data:
                            tenders.append(tender_data)
                    except Exception as e:
                        logger.error(f"Error extracting tender card: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping AusTender: {e}")
            finally:
                await browser.close()

        logger.info(f"Scraped {len(tenders)} tenders from AusTender")
        return tenders

    async def _extract_tender_from_card(
        self, card: Any, page: Page
    ) -> dict[str, Any] | None:
        """Extract tender information from a tender card element."""
        try:
            # Extract basic information
            title_elem = await card.locator(".tender-title").first
            title = await title_elem.inner_text() if title_elem else "Unknown"

            link_elem = await card.locator("a").first
            href = await link_elem.get_attribute("href") if link_elem else None
            tender_url = f"{self.portal_url}{href}" if href else None

            # Extract metadata
            agency_elem = await card.locator(".agency-name").first
            agency = await agency_elem.inner_text() if agency_elem else "Unknown"

            category_elem = await card.locator(".tender-category").first
            category = await category_elem.inner_text() if category_elem else "General"

            closing_date_elem = await card.locator(".closing-date").first
            closing_date_text = (
                await closing_date_elem.inner_text() if closing_date_elem else None
            )

            value_elem = await card.locator(".tender-value").first
            value_text = await value_elem.inner_text() if value_elem else None

            # Parse dates and values
            closing_date = self._parse_date(closing_date_text)
            value_min, value_max = self._parse_value(value_text)

            tender_data = {
                "external_id": href.split("/")[-1] if href else None,
                "title": title.strip(),
                "url": tender_url,
                "portal": "tenders.gov.au",
                "level": "Federal",
                "department": agency.strip(),
                "category": category.strip(),
                "closing_date": closing_date,
                "funding_min": value_min,
                "funding_max": value_max,
                "status": "open",
            }

            # Fetch additional details if URL available
            if tender_url:
                detail_data = await self._fetch_tender_details(page, tender_url)
                tender_data.update(detail_data)

            return tender_data

        except Exception as e:
            logger.error(f"Error extracting tender card data: {e}")
            return None

    async def _fetch_tender_details(
        self, page: Page, tender_url: str
    ) -> dict[str, Any]:
        """Fetch detailed tender information from the tender detail page."""
        try:
            await page.goto(tender_url, wait_until="networkidle")

            # Extract detailed information
            description_elem = await page.locator(".tender-description").first
            description = (
                await description_elem.inner_text() if description_elem else ""
            )

            requirements_elem = await page.locator(".tender-requirements").first
            guidelines = (
                await requirements_elem.inner_text() if requirements_elem else ""
            )

            eligibility_elem = await page.locator(".eligibility-requirements").first
            eligibility = (
                await eligibility_elem.inner_text() if eligibility_elem else ""
            )

            publish_date_elem = await page.locator(".publish-date").first
            publish_date_text = (
                await publish_date_elem.inner_text() if publish_date_elem else None
            )

            return {
                "description": description.strip(),
                "guidelines": guidelines.strip(),
                "eligibility": eligibility.strip(),
                "opening_date": self._parse_date(publish_date_text),
            }

        except Exception as e:
            logger.error(f"Error fetching tender details from {tender_url}: {e}")
            return {}

    async def parse_grant(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse AusTender data into standardized format."""
        # The scraper already returns standardized data
        return raw_data

    def _parse_date(self, date_text: str | None) -> datetime | None:
        """Parse date string to datetime object."""
        if not date_text:
            return None

        try:
            formats = [
                "%d/%m/%Y",
                "%d-%m-%Y",
                "%d %B %Y",
                "%d %b %Y",
                "%Y-%m-%d",
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(date_text.strip(), fmt)
                except ValueError:
                    continue

            logger.warning(f"Could not parse date: {date_text}")
            return None

        except Exception as e:
            logger.error(f"Error parsing date '{date_text}': {e}")
            return None

    def _parse_value(self, value_text: str | None) -> tuple[int | None, int | None]:
        """Parse tender value text to min/max integers."""
        if not value_text:
            return None, None

        try:
            # Remove currency symbols and commas
            cleaned = value_text.replace("$", "").replace(",", "").strip()

            # Handle ranges
            if "-" in cleaned or "to" in cleaned.lower():
                parts = cleaned.replace("to", "-").split("-")
                min_val = int(parts[0].strip()) if len(parts) > 0 else None
                max_val = int(parts[1].strip()) if len(parts) > 1 else None
                return min_val, max_val

            # Single amount
            amount = int(cleaned)
            return amount, amount

        except Exception as e:
            logger.error(f"Error parsing value '{value_text}': {e}")
            return None, None
