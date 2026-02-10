"""Scrapers for State government portals."""

import logging
from datetime import datetime
from typing import Any
from playwright.async_api import async_playwright, Page
from .base import BaseScraper

logger = logging.getLogger(__name__)


class VictoriaTendersScraper(BaseScraper):
    """Scraper for tenders.vic.gov.au (Victoria)."""

    def __init__(self):
        super().__init__("https://www.tenders.vic.gov.au")
        self.search_url = f"{self.portal_url}/tender/search"

    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape Victoria tenders portal."""
        tenders = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                logger.info(f"Starting Victoria scrape: {self.search_url}")
                await page.goto(self.search_url, wait_until="networkidle")

                # Wait for listings
                await page.wait_for_selector(".tender-list-item", timeout=10000)

                # Extract tender listings
                items = await page.locator(".tender-list-item").all()
                logger.info(f"Found {len(items)} Victoria tenders")

                for item in items:
                    try:
                        tender_data = await self._extract_tender(item, page)
                        if tender_data:
                            tenders.append(tender_data)
                    except Exception as e:
                        logger.error(f"Error extracting VIC tender: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping Victoria tenders: {e}")
            finally:
                await browser.close()

        logger.info(f"Scraped {len(tenders)} tenders from Victoria")
        return tenders

    async def _extract_tender(self, item: Any, page: Page) -> dict[str, Any] | None:
        """Extract tender data from list item."""
        try:
            title_elem = await item.locator(".tender-title").first
            title = await title_elem.inner_text() if title_elem else "Unknown"

            link_elem = await item.locator("a").first
            href = await link_elem.get_attribute("href") if link_elem else None
            url = f"{self.portal_url}{href}" if href else None

            dept_elem = await item.locator(".agency").first
            department = await dept_elem.inner_text() if dept_elem else "Unknown"

            closing_elem = await item.locator(".closing-date").first
            closing_text = await closing_elem.inner_text() if closing_elem else None

            return {
                "external_id": href.split("/")[-1] if href else None,
                "title": title.strip(),
                "url": url,
                "portal": "tenders.vic.gov.au",
                "level": "State",
                "state": "VIC",
                "department": department.strip(),
                "category": "Tender",
                "closing_date": self._parse_date(closing_text),
                "status": "open",
            }

        except Exception as e:
            logger.error(f"Error extracting VIC tender data: {e}")
            return None

    async def parse_grant(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse Victoria tender data."""
        return raw_data

    def _parse_date(self, date_text: str | None) -> datetime | None:
        """Parse date string."""
        if not date_text:
            return None

        try:
            formats = ["%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y"]
            for fmt in formats:
                try:
                    return datetime.strptime(date_text.strip(), fmt)
                except ValueError:
                    continue
            return None
        except Exception:
            return None


class NSWBuyScraper(BaseScraper):
    """Scraper for nswbuy.com.au (New South Wales)."""

    def __init__(self):
        super().__init__("https://www.nswbuy.com.au")
        self.search_url = f"{self.portal_url}/tenders"

    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape NSW Buy portal."""
        tenders = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                logger.info(f"Starting NSW scrape: {self.search_url}")
                await page.goto(self.search_url, wait_until="networkidle")

                await page.wait_for_selector(".opportunity-card", timeout=10000)

                cards = await page.locator(".opportunity-card").all()
                logger.info(f"Found {len(cards)} NSW tenders")

                for card in cards:
                    try:
                        tender_data = await self._extract_opportunity(card, page)
                        if tender_data:
                            tenders.append(tender_data)
                    except Exception as e:
                        logger.error(f"Error extracting NSW tender: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping NSW tenders: {e}")
            finally:
                await browser.close()

        logger.info(f"Scraped {len(tenders)} tenders from NSW")
        return tenders

    async def _extract_opportunity(
        self, card: Any, page: Page
    ) -> dict[str, Any] | None:
        """Extract opportunity data from card."""
        try:
            title_elem = await card.locator(".opportunity-title").first
            title = await title_elem.inner_text() if title_elem else "Unknown"

            link_elem = await card.locator("a").first
            href = await link_elem.get_attribute("href") if link_elem else None
            url = f"{self.portal_url}{href}" if href else None

            agency_elem = await card.locator(".agency-name").first
            agency = await agency_elem.inner_text() if agency_elem else "Unknown"

            close_elem = await card.locator(".close-date").first
            close_text = await close_elem.inner_text() if close_elem else None

            return {
                "external_id": href.split("/")[-1] if href else None,
                "title": title.strip(),
                "url": url,
                "portal": "nswbuy.com.au",
                "level": "State",
                "state": "NSW",
                "department": agency.strip(),
                "category": "Tender",
                "closing_date": self._parse_date(close_text),
                "status": "open",
            }

        except Exception as e:
            logger.error(f"Error extracting NSW opportunity data: {e}")
            return None

    async def parse_grant(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse NSW tender data."""
        return raw_data

    def _parse_date(self, date_text: str | None) -> datetime | None:
        """Parse date string."""
        if not date_text:
            return None

        try:
            formats = ["%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y"]
            for fmt in formats:
                try:
                    return datetime.strptime(date_text.strip(), fmt)
                except ValueError:
                    continue
            return None
        except Exception:
            return None


class QLDGrantsScraper(BaseScraper):
    """Scraper for Queensland grants portal."""

    def __init__(self):
        super().__init__("https://www.business.qld.gov.au")
        self.search_url = (
            f"{self.portal_url}/starting-business/grants-assistance"
        )

    async def scrape(self) -> list[dict[str, Any]]:
        """Scrape Queensland grants portal."""
        grants = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                logger.info(f"Starting QLD scrape: {self.search_url}")
                await page.goto(self.search_url, wait_until="networkidle")

                await page.wait_for_selector(".grant-listing", timeout=10000)

                listings = await page.locator(".grant-listing").all()
                logger.info(f"Found {len(listings)} QLD grants")

                for listing in listings:
                    try:
                        grant_data = await self._extract_grant(listing, page)
                        if grant_data:
                            grants.append(grant_data)
                    except Exception as e:
                        logger.error(f"Error extracting QLD grant: {e}")
                        continue

            except Exception as e:
                logger.error(f"Error scraping QLD grants: {e}")
            finally:
                await browser.close()

        logger.info(f"Scraped {len(grants)} grants from Queensland")
        return grants

    async def _extract_grant(self, listing: Any, page: Page) -> dict[str, Any] | None:
        """Extract grant data from listing."""
        try:
            title_elem = await listing.locator(".grant-name").first
            title = await title_elem.inner_text() if title_elem else "Unknown"

            link_elem = await listing.locator("a").first
            href = await link_elem.get_attribute("href") if link_elem else None
            url = f"{self.portal_url}{href}" if href and not href.startswith("http") else href

            dept_elem = await listing.locator(".department").first
            department = await dept_elem.inner_text() if dept_elem else "Unknown"

            close_elem = await listing.locator(".closing-date").first
            close_text = await close_elem.inner_text() if close_elem else None

            return {
                "external_id": href.split("/")[-1] if href else None,
                "title": title.strip(),
                "url": url,
                "portal": "business.qld.gov.au",
                "level": "State",
                "state": "QLD",
                "department": department.strip(),
                "category": "Grant",
                "closing_date": self._parse_date(close_text),
                "status": "open",
            }

        except Exception as e:
            logger.error(f"Error extracting QLD grant data: {e}")
            return None

    async def parse_grant(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse QLD grant data."""
        return raw_data

    def _parse_date(self, date_text: str | None) -> datetime | None:
        """Parse date string."""
        if not date_text:
            return None

        try:
            formats = ["%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y"]
            for fmt in formats:
                try:
                    return datetime.strptime(date_text.strip(), fmt)
                except ValueError:
                    continue
            return None
        except Exception:
            return None
