"""AI-powered parser using Claude for extracting grant metadata."""

import json
import logging
from typing import Any
from anthropic import Anthropic

logger = logging.getLogger(__name__)


class AIParser:
    """Uses Claude to parse unstructured grant data and extract structured information."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20240229"):
        self.client = Anthropic(api_key=api_key)
        self.model = model

    async def parse_grant_criteria(
        self, guidelines_text: str, grant_title: str = ""
    ) -> dict[str, Any]:
        """Extract selection criteria from grant guidelines using Claude."""
        try:
            prompt = self._build_criteria_extraction_prompt(guidelines_text, grant_title)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                temperature=0.3,  # Lower temperature for more consistent parsing
                messages=[{"role": "user", "content": prompt}],
            )

            # Extract JSON from response
            response_text = (
                response.content[0].text if response.content else "{}"
            )

            # Parse JSON response
            parsed_data = json.loads(response_text)

            logger.info(
                f"Successfully parsed criteria for: {grant_title[:50]}..."
            )
            return parsed_data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Claude response: {e}")
            return self._get_empty_criteria_response()
        except Exception as e:
            logger.error(f"Error parsing grant criteria with Claude: {e}")
            return self._get_empty_criteria_response()

    async def extract_metadata(
        self, description: str, guidelines: str, eligibility: str
    ) -> dict[str, Any]:
        """Extract structured metadata from grant text using Claude."""
        try:
            prompt = self._build_metadata_extraction_prompt(
                description, guidelines, eligibility
            )

            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = (
                response.content[0].text if response.content else "{}"
            )
            parsed_data = json.loads(response_text)

            logger.info("Successfully extracted grant metadata")
            return parsed_data

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Claude response: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error extracting metadata with Claude: {e}")
            return {}

    async def categorize_grant(
        self, title: str, description: str
    ) -> dict[str, Any]:
        """Categorize grant by type, industry, and target audience using Claude."""
        try:
            prompt = f"""Analyze this Australian government grant and categorize it.

Grant Title: {title}

Grant Description: {description}

Please provide a JSON response with the following structure:
{{
  "primary_category": "one of: Infrastructure, Health, Education, Environment, Arts, Economic Development, Social Services, Research, Technology, Agriculture",
  "subcategories": ["list of relevant subcategories"],
  "target_audience": ["who is eligible: Community Groups, Businesses, Local Government, Not-for-Profits, Individuals, etc."],
  "focus_areas": ["specific focus areas or themes"],
  "estimated_complexity": "one of: Low, Medium, High",
  "application_effort": "estimated time to complete application in hours"
}}

Respond ONLY with valid JSON, no other text."""

            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = (
                response.content[0].text if response.content else "{}"
            )
            parsed_data = json.loads(response_text)

            logger.info(f"Successfully categorized grant: {title[:50]}...")
            return parsed_data

        except Exception as e:
            logger.error(f"Error categorizing grant: {e}")
            return {
                "primary_category": "General",
                "subcategories": [],
                "target_audience": [],
                "focus_areas": [],
                "estimated_complexity": "Medium",
                "application_effort": 10,
            }

    def _build_criteria_extraction_prompt(
        self, guidelines_text: str, grant_title: str
    ) -> str:
        """Build the prompt for extracting selection criteria."""
        return f"""You are an expert at analyzing Australian government grant guidelines and extracting selection criteria.

Grant Title: {grant_title}

Grant Guidelines:
{guidelines_text}

Your task is to extract all selection criteria from these grant guidelines. For each criterion, identify:
1. The criterion title/name
2. A clear description of what is being assessed
3. The weighting/importance (if mentioned)
4. Maximum word count for responses (if specified)

Please provide a JSON response with the following structure:
{{
  "selection_criteria": [
    {{
      "id": "criterion-1",
      "title": "Criterion title",
      "description": "What is being assessed",
      "weight": 25,
      "max_words": 500,
      "key_focus_areas": ["list of key points to address"]
    }}
  ],
  "eligibility_requirements": [
    "List of eligibility requirements"
  ],
  "mandatory_attachments": [
    "List of required documents/attachments"
  ],
  "assessment_priorities": [
    "What the assessors will prioritize"
  ]
}}

If word limits are not specified, use null. If weights are not specified, distribute evenly.
Respond ONLY with valid JSON, no other text."""

    def _build_metadata_extraction_prompt(
        self, description: str, guidelines: str, eligibility: str
    ) -> str:
        """Build the prompt for extracting general metadata."""
        return f"""Extract key metadata from this Australian government grant information.

Description:
{description}

Guidelines:
{guidelines}

Eligibility:
{eligibility}

Please extract and return a JSON response with:
{{
  "key_benefits": ["list of main benefits/outcomes"],
  "target_sectors": ["which sectors/industries this targets"],
  "geographic_scope": "National, State-wide, Regional, or Local",
  "funding_type": "one of: Grant, Rebate, Loan, Tax Incentive, Scholarship",
  "competitive": true/false (is it competitive or first-come-first-served),
  "multi_year": true/false (does funding span multiple years),
  "matched_funding_required": true/false,
  "key_dates_mentioned": ["any important dates or milestones"],
  "contacts": ["contact persons or departments mentioned"]
}}

Respond ONLY with valid JSON, no other text."""

    def _get_empty_criteria_response(self) -> dict[str, Any]:
        """Return empty criteria response structure."""
        return {
            "selection_criteria": [],
            "eligibility_requirements": [],
            "mandatory_attachments": [],
            "assessment_priorities": [],
        }
