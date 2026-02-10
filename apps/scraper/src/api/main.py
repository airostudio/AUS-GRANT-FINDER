"""FastAPI application for AusGrant Scraper."""

import logging
import os
from typing import Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from src.orchestrator import ScraperOrchestrator
from src.database.service import DatabaseService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AusGrant Scraper API",
    description="API for scraping Australian government grants and tenders",
    version="0.2.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global database service
db = DatabaseService(os.getenv("DATABASE_URL"))


@app.on_event("startup")
async def startup_event():
    """Connect to database on startup."""
    await db.connect()
    logger.info("Application started, database connected")


@app.on_event("shutdown")
async def shutdown_event():
    """Disconnect from database on shutdown."""
    await db.disconnect()
    logger.info("Application shutdown, database disconnected")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ausgrant-scraper",
        "version": "0.2.0"
    }


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "AusGrant Scraper API",
        "version": "0.2.0",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "scrape_federal": "/scrape/federal",
            "list_grants": "/grants",
            "statistics": "/stats"
        }
    }


async def run_scraper_task():
    """Background task to run the scraper orchestrator."""
    try:
        orchestrator = ScraperOrchestrator()
        results = await orchestrator.run_all_scrapers()
        logger.info(f"Scraper task completed: {results}")
        return results
    except Exception as e:
        logger.error(f"Scraper task failed: {e}")
        raise


@app.post("/scrape/federal")
async def scrape_federal(background_tasks: BackgroundTasks) -> dict[str, Any]:
    """Trigger scraping of Federal government portals."""
    try:
        # Run scraper in background
        background_tasks.add_task(run_scraper_task)

        return {
            "status": "started",
            "message": "Federal portal scrape started in background",
            "portals": ["grants.gov.au", "tenders.gov.au"],
        }
    except Exception as e:
        logger.error(f"Error starting federal scrape: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scrape/all")
async def scrape_all(background_tasks: BackgroundTasks) -> dict[str, Any]:
    """Trigger scraping of all configured portals."""
    try:
        background_tasks.add_task(run_scraper_task)

        return {
            "status": "started",
            "message": "All portal scrapes started in background",
        }
    except Exception as e:
        logger.error(f"Error starting full scrape: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/grants")
async def list_grants(
    portal: str | None = None,
    limit: int = 100,
    status: str = "open"
) -> dict[str, Any]:
    """List all scraped grants."""
    try:
        grants = await db.get_open_grants(portal=portal, limit=limit)

        return {
            "grants": grants,
            "total": len(grants),
            "filters": {
                "portal": portal,
                "status": status,
                "limit": limit
            }
        }
    except Exception as e:
        logger.error(f"Error retrieving grants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/grants/{grant_id}")
async def get_grant(grant_id: str) -> dict[str, Any]:
    """Get details for a specific grant."""
    try:
        # TODO: Implement specific grant retrieval
        return {
            "id": grant_id,
            "message": "Grant detail endpoint - implementation pending"
        }
    except Exception as e:
        logger.error(f"Error retrieving grant {grant_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_statistics() -> dict[str, Any]:
    """Get statistics about scraped grants."""
    try:
        stats = await db.get_grant_statistics()

        return {
            "statistics": stats,
            "timestamp": "now"
        }
    except Exception as e:
        logger.error(f"Error retrieving statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/maintenance/close-expired")
async def close_expired_grants() -> dict[str, Any]:
    """Manually trigger closing of expired grants."""
    try:
        count = await db.close_expired_grants()

        return {
            "status": "success",
            "closed_count": count,
            "message": f"Closed {count} expired grants"
        }
    except Exception as e:
        logger.error(f"Error closing expired grants: {e}")
        raise HTTPException(status_code=500, detail=str(e))
