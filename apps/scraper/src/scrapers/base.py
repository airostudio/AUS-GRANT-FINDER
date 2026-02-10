"""Base scraper class for Australian government portals."""

from abc import ABC, abstractmethod
from typing import Any


class BaseScraper(ABC):
    """Abstract base class for portal scrapers."""

    def __init__(self, portal_url: str):
        self.portal_url = portal_url

    @abstractmethod
    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape the portal and return grant/tender data."""
        pass

    @abstractmethod
    async def parse_grant(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse raw grant data into structured format."""
        pass
