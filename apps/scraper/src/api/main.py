"""FastAPI application for AusGrant Scraper."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AusGrant Scraper API",
    description="API for scraping Australian government grants and tenders",
    version="0.1.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy", "service": "ausgrant-scraper"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "AusGrant Scraper API",
        "docs": "/docs",
        "health": "/health",
    }


@app.post("/scrape/federal")
async def scrape_federal() -> dict[str, str]:
    """Trigger scraping of Federal government portals."""
    # TODO: Implement scraper logic
    return {
        "status": "queued",
        "message": "Federal portal scrape queued",
        "portals": ["grants.gov.au", "tenders.gov.au"],
    }


@app.post("/scrape/state/{state}")
async def scrape_state(state: str) -> dict[str, str]:
    """Trigger scraping of State government portals."""
    # TODO: Implement scraper logic
    return {
        "status": "queued",
        "message": f"{state.upper()} portal scrape queued",
        "state": state,
    }


@app.get("/grants")
async def list_grants() -> dict[str, list]:
    """List all scraped grants."""
    # TODO: Implement database query
    return {"grants": [], "total": 0}


@app.get("/grants/{grant_id}")
async def get_grant(grant_id: str) -> dict[str, str]:
    """Get details for a specific grant."""
    # TODO: Implement database query
    return {"id": grant_id, "message": "Not implemented"}
