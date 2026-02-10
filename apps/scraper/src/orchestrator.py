"""Scraper orchestrator that coordinates all portal scrapers."""

import logging
import os
from typing import Any
from dotenv import load_dotenv

from src.scrapers.federal import GrantConnectScraper, AusTenderScraper
from src.scrapers.state import VictoriaTendersScraper, NSWBuyScraper, QLDGrantsScraper
from src.parsers.ai_parser import AIParser
from src.database.service import DatabaseService

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ScraperOrchestrator:
    """Coordinates scraping, parsing, and storage of grant data."""

    def __init__(self):
        self.database = DatabaseService(os.getenv("DATABASE_URL"))
        self.ai_parser = AIParser(os.getenv("ANTHROPIC_API_KEY"))

        # Initialize scrapers
        self.scrapers = {
            # Federal portals
            "grants.gov.au": GrantConnectScraper(),
            "tenders.gov.au": AusTenderScraper(),
            # State portals
            "tenders.vic.gov.au": VictoriaTendersScraper(),
            "nswbuy.com.au": NSWBuyScraper(),
            "business.qld.gov.au": QLDGrantsScraper(),
        }

    async def run_all_scrapers(self) -> dict[str, int]:
        """Run all configured scrapers and return statistics."""
        logger.info("Starting scraper orchestration")

        # Connect to database
        await self.database.connect()

        results = {}

        try:
            # Close expired grants first
            closed_count = await self.database.close_expired_grants()
            logger.info(f"Closed {closed_count} expired grants")

            # Run each scraper
            for portal_name, scraper in self.scrapers.items():
                try:
                    logger.info(f"Running scraper for: {portal_name}")
                    count = await self._run_scraper(portal_name, scraper)
                    results[portal_name] = count
                except Exception as e:
                    logger.error(f"Error running scraper for {portal_name}: {e}")
                    results[portal_name] = 0

            # Get final statistics
            stats = await self.database.get_grant_statistics()
            logger.info(f"Database statistics: {stats}")

            results["_statistics"] = stats

        finally:
            # Disconnect from database
            await self.database.disconnect()

        logger.info(f"Scraper orchestration complete. Results: {results}")
        return results

    async def _run_scraper(self, portal_name: str, scraper: Any) -> int:
        """Run a single scraper and store results."""
        try:
            # Scrape grants from portal
            grants = await scraper.scrape()
            logger.info(f"Scraped {len(grants)} grants from {portal_name}")

            stored_count = 0

            # Process each grant
            for grant in grants:
                try:
                    # Enhance with AI parsing if guidelines available
                    if grant.get("guidelines"):
                        criteria_data = await self.ai_parser.parse_grant_criteria(
                            grant["guidelines"],
                            grant.get("title", "")
                        )
                        grant["criteria"] = criteria_data.get("selection_criteria", [])

                    # Categorize the grant
                    if grant.get("title") and grant.get("description"):
                        category_data = await self.ai_parser.categorize_grant(
                            grant["title"],
                            grant["description"]
                        )
                        grant["category"] = category_data.get("primary_category", "General")

                    # Store in database
                    grant_id = await self.database.upsert_grant(grant)

                    if grant_id:
                        stored_count += 1

                except Exception as e:
                    logger.error(f"Error processing grant '{grant.get('title', 'Unknown')}': {e}")
                    continue

            logger.info(f"Stored {stored_count}/{len(grants)} grants from {portal_name}")
            return stored_count

        except Exception as e:
            logger.error(f"Error in scraper for {portal_name}: {e}")
            raise


async def run_federal_scrapers():
    """Convenience function to run federal scrapers."""
    orchestrator = ScraperOrchestrator()
    results = await orchestrator.run_all_scrapers()
    return results


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_federal_scrapers())
