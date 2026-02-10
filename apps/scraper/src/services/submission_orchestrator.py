"""Submission Orchestrator - End-to-End Grant Application

Coordinates the complete process: Generate → Review → Fill → Submit
"""

import logging
import os
from typing import Any
from dotenv import load_dotenv

from src.services.grant_writer_service import GrantWriterService
from src.services.form_filler_service import FormFillerService
from src.services.organization_service import OrganizationService
from src.database.service import DatabaseService

load_dotenv()

logger = logging.getLogger(__name__)


class SubmissionOrchestrator:
    """Orchestrates the complete grant application submission process."""

    def __init__(self):
        self.writer_service = GrantWriterService()
        self.form_filler = FormFillerService(headless=False)
        self.org_service = OrganizationService(os.getenv("DATABASE_URL"))
        self.database = DatabaseService(os.getenv("DATABASE_URL"))

    async def connect(self) -> None:
        """Connect all services."""
        await self.writer_service.connect()
        await self.org_service.connect()
        await self.database.connect()

    async def disconnect(self) -> None:
        """Disconnect all services."""
        await self.writer_service.disconnect()
        await self.org_service.disconnect()
        await self.database.disconnect()

    async def submit_application(
        self,
        grant_id: str,
        organization_id: str,
        mode: str = "semi-automatic",
        auto_fill: bool = True,
    ) -> dict[str, Any]:
        """
        Complete end-to-end grant application submission.

        Workflow:
        1. Generate AI responses for all criteria
        2. Store application in database
        3. (Optional) Fill form automatically
        4. (Optional) Submit application
        5. Update status and store reference number

        Args:
            grant_id: Grant to apply for
            organization_id: Applying organization
            mode: "automatic", "semi-automatic", or "manual"
            auto_fill: Whether to automatically fill the form

        Returns:
            Complete submission result
        """
        logger.info(
            f"Starting application submission: grant={grant_id}, "
            f"org={organization_id}, mode={mode}"
        )

        try:
            # Step 1: Generate AI application
            logger.info("Step 1: Generating AI application...")
            application_result = await self.writer_service.generate_application(
                grant_id=grant_id,
                organization_id=organization_id,
            )

            application_id = application_result["application_id"]
            responses = application_result["responses"]

            logger.info(
                f"Application generated: {len(responses)} criteria responses"
            )

            # Step 2: Get grant details for portal info
            grant = await self._get_grant(grant_id)
            if not grant:
                raise ValueError(f"Grant {grant_id} not found")

            portal = grant.get("portal")

            result = {
                "step": "generated",
                "application_id": application_id,
                "grant": {
                    "id": grant_id,
                    "title": grant.get("title"),
                    "portal": portal,
                },
                "organization": application_result["organization"],
                "responses_count": len(responses),
                "mode": mode,
            }

            # Step 3: Fill form (if auto_fill enabled)
            if auto_fill and portal:
                logger.info("Step 2: Filling application form...")

                # Prepare responses for form filler
                form_responses = self._prepare_form_responses(
                    responses, application_result.get("organization")
                )

                fill_result = await self.form_filler.fill_application(
                    application_id=application_id,
                    portal=portal,
                    responses=form_responses,
                    mode=mode,
                )

                result["step"] = "filled" if fill_result["success"] else "fill_failed"
                result["form_filling"] = fill_result

                # Step 4: Update application status
                if fill_result["success"]:
                    await self._update_application_status(
                        application_id,
                        status="submitted" if mode != "manual" else "draft",
                        reference_number=fill_result.get("reference_number"),
                    )

                    result["step"] = "submitted"
                    result["reference_number"] = fill_result.get("reference_number")

            logger.info(f"Application submission complete: {result['step']}")
            return result

        except Exception as e:
            logger.error(f"Error in submission orchestration: {e}")
            raise

    def _prepare_form_responses(
        self,
        responses: list[dict[str, Any]],
        organization: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Prepare responses for form filling by adding organization data."""
        form_responses = []

        # Add organization fields
        form_responses.append({
            "criterion_id": "organization-name",
            "response": organization.get("name", ""),
        })

        # Note: In production, fetch full org data from database
        # form_responses.append({
        #     "criterion_id": "abn",
        #     "response": organization.get("abn", ""),
        # })

        # Add criterion responses
        for response in responses:
            form_responses.append({
                "criterion_id": response.get("criterion_id"),
                "response": response.get("response"),
            })

        return form_responses

    async def _get_grant(self, grant_id: str) -> dict[str, Any] | None:
        """Fetch grant from database."""
        if not self.database.pool:
            raise RuntimeError("Database not connected")

        async with self.database.pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM "Grant" WHERE id = $1',
                grant_id,
            )

            if row:
                return dict(row)
            return None

    async def _update_application_status(
        self,
        application_id: str,
        status: str,
        reference_number: str | None = None,
    ) -> None:
        """Update application status in database."""
        if not self.database.pool:
            raise RuntimeError("Database not connected")

        async with self.database.pool.acquire() as conn:
            if reference_number:
                await conn.execute(
                    """
                    UPDATE "Application"
                    SET status = $1, "referenceNumber" = $2,
                        "submittedAt" = NOW(), "updatedAt" = NOW()
                    WHERE id = $3
                    """,
                    status,
                    reference_number,
                    application_id,
                )
            else:
                await conn.execute(
                    """
                    UPDATE "Application"
                    SET status = $1, "updatedAt" = NOW()
                    WHERE id = $2
                    """,
                    status,
                    application_id,
                )

            logger.info(f"Updated application {application_id} status: {status}")

    async def get_submission_status(
        self, application_id: str
    ) -> dict[str, Any] | None:
        """Get current status of an application submission."""
        if not self.database.pool:
            raise RuntimeError("Database not connected")

        async with self.database.pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM "Application" WHERE id = $1',
                application_id,
            )

            if row:
                return dict(row)
            return None

    async def retry_submission(
        self, application_id: str, mode: str = "semi-automatic"
    ) -> dict[str, Any]:
        """Retry a failed submission."""
        logger.info(f"Retrying submission for application {application_id}")

        # Get application data
        application = await self.get_submission_status(application_id)
        if not application:
            raise ValueError(f"Application {application_id} not found")

        grant_id = application.get("grantId")
        organization_id = application.get("organizationId")

        # Retry the submission
        return await self.submit_application(
            grant_id=grant_id,
            organization_id=organization_id,
            mode=mode,
            auto_fill=True,
        )
