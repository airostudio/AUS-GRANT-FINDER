"""AI-powered parser using Claude for extracting grant metadata."""

from typing import Any
from anthropic import Anthropic


class AIParser:
    """Uses Claude to parse unstructured grant data."""

    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)

    async def parse_grant_criteria(self, raw_text: str) -> dict[str, Any]:
        """Extract selection criteria from grant guidelines."""
        # TODO: Implement Claude API call for parsing
        return {
            "criteria": [],
            "eligibility": [],
            "closing_date": None,
            "funding_amount": None,
        }

    async def extract_metadata(self, html_content: str) -> dict[str, Any]:
        """Extract structured metadata from HTML content."""
        # TODO: Implement metadata extraction
        return {}
