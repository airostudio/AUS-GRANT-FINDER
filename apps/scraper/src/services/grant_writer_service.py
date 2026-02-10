"""Grant Writing Service - The Veteran

Orchestrates the complete grant writing process using AI and RAG.
"""

import logging
import os
from typing import Any
from dotenv import load_dotenv

from src.parsers.ai_parser import AIParser
from src.services.organization_service import OrganizationService
from src.database.service import DatabaseService

load_dotenv()

logger = logging.getLogger(__name__)


class GrantWriterService:
    """Orchestrates AI-powered grant writing with RAG."""

    def __init__(self):
        self.database = DatabaseService(os.getenv("DATABASE_URL"))
        self.org_service = OrganizationService(os.getenv("DATABASE_URL"))
        self.ai_parser = AIParser(os.getenv("ANTHROPIC_API_KEY"))

    async def connect(self) -> None:
        """Connect to database."""
        await self.database.connect()
        await self.org_service.connect()

    async def disconnect(self) -> None:
        """Disconnect from database."""
        await self.database.disconnect()
        await self.org_service.disconnect()

    async def generate_application(
        self,
        grant_id: str,
        organization_id: str,
    ) -> dict[str, Any]:
        """
        Generate a complete grant application.

        Args:
            grant_id: ID of the grant to apply for
            organization_id: ID of the applying organization

        Returns:
            Dictionary containing generated responses for all criteria
        """
        logger.info(f"Generating application for grant {grant_id}, org {organization_id}")

        try:
            # Fetch grant details
            grant = await self._get_grant(grant_id)
            if not grant:
                raise ValueError(f"Grant {grant_id} not found")

            # Fetch organization details
            organization = await self.org_service.get_organization(organization_id)
            if not organization:
                raise ValueError(f"Organization {organization_id} not found")

            # Extract criteria if not already parsed
            criteria = grant.get("criteria", [])
            if not criteria and grant.get("guidelines"):
                logger.info("Parsing grant criteria from guidelines")
                parsed = await self.ai_parser.parse_grant_criteria(
                    grant["guidelines"],
                    grant.get("title", "")
                )
                criteria = parsed.get("selection_criteria", [])

            if not criteria:
                raise ValueError("No selection criteria found for grant")

            # Generate responses for each criterion
            responses = []
            for criterion in criteria:
                response = await self._generate_criterion_response(
                    criterion,
                    grant,
                    organization
                )
                responses.append(response)

            # Create application record
            application_id = await self._create_application(
                grant_id,
                organization_id,
                responses
            )

            return {
                "application_id": application_id,
                "grant": {
                    "id": grant_id,
                    "title": grant.get("title"),
                    "portal": grant.get("portal"),
                },
                "organization": {
                    "id": organization_id,
                    "name": organization.get("name"),
                },
                "responses": responses,
                "total_criteria": len(criteria),
            }

        except Exception as e:
            logger.error(f"Error generating application: {e}")
            raise

    async def _generate_criterion_response(
        self,
        criterion: dict[str, Any],
        grant: dict[str, Any],
        organization: dict[str, Any],
    ) -> dict[str, Any]:
        """Generate a response to a single selection criterion."""
        from anthropic import Anthropic

        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Build context from organization data
        context = self._build_context(organization, criterion)

        # Build prompt using the Veteran persona
        prompt = self._build_prompt(criterion, grant, organization, context)

        # Call Claude to generate response
        logger.info(f"Generating response for: {criterion.get('title', 'Unknown')}")

        response = client.messages.create(
            model="claude-3-5-sonnet-20240229",
            max_tokens=4096,
            temperature=0.7,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

        response_text = response.content[0].text if response.content else ""

        # Calculate word count
        word_count = len(response_text.split())

        # Extract evidence used
        evidence = self._extract_evidence(response_text, organization)

        return {
            "criterion_id": criterion.get("id"),
            "criterion_title": criterion.get("title"),
            "response": response_text,
            "word_count": word_count,
            "max_words": criterion.get("max_words"),
            "evidence": evidence,
        }

    def _build_context(
        self,
        organization: dict[str, Any],
        criterion: dict[str, Any],
    ) -> list[str]:
        """Build relevant context from organization data."""
        context = []

        # Organization overview
        context.append(
            f"{organization['name']} (ABN: {organization['abn']}) - "
            f"{organization['yearsInOperation']} years in {organization['industry']}"
        )

        if organization.get("employees"):
            context.append(f"{organization['employees']} employees")

        if organization.get("revenue"):
            context.append(f"Annual revenue: ${organization['revenue']:,}")

        # Add achievements (top 5 most relevant)
        achievements = organization.get("achievements", [])
        if achievements:
            context.append("\nKey Achievements:")
            for achievement in achievements[:5]:
                context.append(f"- {achievement}")

        # Add capabilities
        capabilities = organization.get("capabilities", [])
        if capabilities:
            context.append("\nCore Capabilities:")
            for capability in capabilities[:5]:
                context.append(f"- {capability}")

        # Add previous grants
        previous_grants = organization.get("previousGrants", [])
        if previous_grants:
            context.append("\nPrevious Grant Success:")
            for prev_grant in previous_grants[:3]:
                context.append(f"- {prev_grant}")

        return context

    def _build_prompt(
        self,
        criterion: dict[str, Any],
        grant: dict[str, Any],
        organization: dict[str, Any],
        context: list[str],
    ) -> str:
        """Build the prompt for Claude using the Veteran persona."""
        prompt = f"""You are a Chief Grant Writer with 30+ years of experience in the Australian public sector. You have successfully written hundreds of winning grant applications.

Your writing principles:
1. NEVER use AI-isms or robotic phrases like "leverage," "synergy," or "paradigm shift"
2. ALWAYS ground responses in factual, verifiable data
3. Write in a natural, conversational yet professional tone
4. Focus on outcomes, impact, and tangible benefits
5. Use active voice and clear, concise language
6. Include specific examples and quantifiable results

**Grant Information:**
Title: {grant.get('title')}
Department: {grant.get('department')}
Portal: {grant.get('portal')}

**Selection Criterion:**
{criterion.get('title')}

Description: {criterion.get('description')}

"""

        if criterion.get('max_words'):
            prompt += f"**Word Limit:** {criterion['max_words']} words (STRICTLY ADHERE to this limit)\n\n"

        if criterion.get('weight'):
            prompt += f"**Weighting:** {criterion['weight']}%\n\n"

        if criterion.get('key_focus_areas'):
            prompt += f"""**Key Focus Areas:**
{chr(10).join(f"- {area}" for area in criterion['key_focus_areas'])}

"""

        prompt += f"""**Organization Context:**
{chr(10).join(context)}

**Your Task:**
Write a compelling, evidence-based response to the selection criterion above.

Requirements:
- Use the organization's ACTUAL data and achievements
- Write in a natural, professional tone
- Avoid AI-isms and corporate jargon
- Focus on measurable outcomes and community impact
- Include specific numbers, dates, and evidence
- Demonstrate genuine understanding of the grant objectives
"""

        if criterion.get('max_words'):
            prompt += f"\n**CRITICAL:** Your response MUST be {criterion['max_words']} words or less.\n"

        prompt += "\nWrite your response now:"

        return prompt

    def _extract_evidence(
        self,
        response: str,
        organization: dict[str, Any],
    ) -> list[str]:
        """Extract evidence from the response."""
        evidence = []
        response_lower = response.lower()

        # Check achievements
        achievements = organization.get("achievements", [])
        for achievement in achievements:
            if any(word in response_lower for word in achievement.lower().split() if len(word) > 4):
                evidence.append(achievement)

        # Check capabilities
        capabilities = organization.get("capabilities", [])
        for capability in capabilities:
            if any(word in response_lower for word in capability.lower().split() if len(word) > 4):
                evidence.append(capability)

        return list(set(evidence))[:5]  # Top 5 unique evidence items

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

    async def _create_application(
        self,
        grant_id: str,
        organization_id: str,
        responses: list[dict[str, Any]],
    ) -> str:
        """Create application record in database."""
        if not self.database.pool:
            raise RuntimeError("Database not connected")

        async with self.database.pool.acquire() as conn:
            # Create application
            app_id = await conn.fetchval(
                """
                INSERT INTO "Application" (
                    "grantId", "organizationId", status, "createdAt", "updatedAt"
                )
                VALUES ($1, $2, 'draft', NOW(), NOW())
                RETURNING id
                """,
                grant_id,
                organization_id,
            )

            # Create response records
            for response in responses:
                await conn.execute(
                    """
                    INSERT INTO "Response" (
                        "applicationId", "criteriaId", "criteriaTitle",
                        response, "wordCount", confidence, version,
                        approved, "createdAt", "updatedAt"
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 1, false, NOW(), NOW())
                    """,
                    app_id,
                    response.get("criterion_id"),
                    response.get("criterion_title"),
                    response.get("response"),
                    response.get("word_count"),
                    0.85,  # Default confidence
                )

            logger.info(f"Created application {app_id} with {len(responses)} responses")
            return app_id
