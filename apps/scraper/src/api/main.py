"""FastAPI application for AusGrant Scraper."""

import logging
import os
from typing import Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from src.orchestrator import ScraperOrchestrator
from src.database.service import DatabaseService
from src.services.organization_service import OrganizationService
from src.services.grant_writer_service import GrantWriterService
from src.services.submission_orchestrator import SubmissionOrchestrator

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AusGrant-Automate API",
    description="Complete AI-powered grant application system",
    version="1.0.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global services
db = DatabaseService(os.getenv("DATABASE_URL"))
org_service = OrganizationService(os.getenv("DATABASE_URL"))
writer_service = GrantWriterService()
submission_orchestrator = SubmissionOrchestrator()


@app.on_event("startup")
async def startup_event():
    """Connect to database on startup."""
    await db.connect()
    await org_service.connect()
    await writer_service.connect()
    await submission_orchestrator.connect()
    logger.info("Application started, all services connected")


@app.on_event("shutdown")
async def shutdown_event():
    """Disconnect from database on shutdown."""
    await db.disconnect()
    await org_service.disconnect()
    await writer_service.disconnect()
    await submission_orchestrator.disconnect()
    logger.info("Application shutdown, all services disconnected")


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


# ============================================================================
# Organization Management Endpoints
# ============================================================================

@app.post("/organizations")
async def create_organization(org_data: dict[str, Any]) -> dict[str, Any]:
    """Create a new organization."""
    try:
        org_id = await org_service.create_organization(org_data)

        return {
            "status": "success",
            "organization_id": org_id,
            "message": f"Organization '{org_data.get('name')}' created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating organization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/organizations")
async def list_organizations(limit: int = 100) -> dict[str, Any]:
    """List all organizations."""
    try:
        organizations = await org_service.list_organizations(limit=limit)

        return {
            "organizations": organizations,
            "total": len(organizations),
        }
    except Exception as e:
        logger.error(f"Error listing organizations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/organizations/{org_id}")
async def get_organization(org_id: str) -> dict[str, Any]:
    """Get organization by ID."""
    try:
        organization = await org_service.get_organization(org_id)

        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")

        return organization
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving organization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/organizations/{org_id}")
async def update_organization(
    org_id: str,
    updates: dict[str, Any]
) -> dict[str, Any]:
    """Update an organization."""
    try:
        success = await org_service.update_organization(org_id, updates)

        if not success:
            raise HTTPException(status_code=404, detail="Organization not found")

        return {
            "status": "success",
            "organization_id": org_id,
            "message": "Organization updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating organization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/organizations/{org_id}")
async def delete_organization(org_id: str) -> dict[str, Any]:
    """Delete an organization."""
    try:
        success = await org_service.delete_organization(org_id)

        if not success:
            raise HTTPException(status_code=404, detail="Organization not found")

        return {
            "status": "success",
            "message": "Organization deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting organization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Grant Writing Endpoints (The Veteran)
# ============================================================================

@app.post("/applications/generate")
async def generate_application(
    grant_id: str,
    organization_id: str,
    background_tasks: BackgroundTasks
) -> dict[str, Any]:
    """
    Generate a complete grant application using AI.

    The Veteran will analyze the grant criteria and organization data,
    then generate compelling, evidence-based responses.
    """
    try:
        logger.info(f"Generating application for grant {grant_id}, org {organization_id}")

        application = await writer_service.generate_application(
            grant_id=grant_id,
            organization_id=organization_id
        )

        return {
            "status": "success",
            "message": "Grant application generated successfully",
            **application
        }
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating application: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/applications/{application_id}")
async def get_application(application_id: str) -> dict[str, Any]:
    """Get application details including all responses."""
    try:
        # TODO: Implement application retrieval
        return {
            "application_id": application_id,
            "status": "draft",
            "message": "Application retrieval - implementation pending"
        }
    except Exception as e:
        logger.error(f"Error retrieving application: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/applications")
async def list_applications(
    organization_id: str | None = None,
    status: str | None = None,
    limit: int = 100
) -> dict[str, Any]:
    """List applications with optional filtering."""
    try:
        # TODO: Implement application listing
        return {
            "applications": [],
            "total": 0,
            "filters": {
                "organization_id": organization_id,
                "status": status,
                "limit": limit
            }
        }
    except Exception as e:
        logger.error(f"Error listing applications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Complete Submission Endpoints (The Closer)
# ============================================================================

@app.post("/submissions/complete")
async def submit_complete_application(
    grant_id: str,
    organization_id: str,
    mode: str = "semi-automatic",
    auto_fill: bool = True,
) -> dict[str, Any]:
    """
    Complete end-to-end application: Generate → Fill → Submit

    This is the main endpoint that orchestrates the entire process:
    1. Generate AI responses using The Veteran
    2. Fill the government form automatically
    3. Submit the application (with human verification if mode=semi-automatic)

    Args:
        grant_id: ID of grant to apply for
        organization_id: ID of applying organization
        mode: "automatic", "semi-automatic" (default), or "manual"
        auto_fill: Whether to automatically fill forms (default: True)

    Returns:
        Complete submission result with application ID and reference number
    """
    try:
        logger.info(
            f"Complete submission requested: grant={grant_id}, "
            f"org={organization_id}, mode={mode}"
        )

        result = await submission_orchestrator.submit_application(
            grant_id=grant_id,
            organization_id=organization_id,
            mode=mode,
            auto_fill=auto_fill,
        )

        return {
            "status": "success",
            "message": f"Application {result['step']}",
            **result
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in complete submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/submissions/{application_id}/status")
async def get_submission_status(application_id: str) -> dict[str, Any]:
    """Get current status of an application submission."""
    try:
        status = await submission_orchestrator.get_submission_status(application_id)

        if not status:
            raise HTTPException(status_code=404, detail="Application not found")

        return {
            "application_id": application_id,
            "status": status.get("status"),
            "reference_number": status.get("referenceNumber"),
            "submitted_at": status.get("submittedAt"),
            "created_at": status.get("createdAt"),
            "updated_at": status.get("updatedAt"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving submission status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/submissions/{application_id}/retry")
async def retry_submission(
    application_id: str,
    mode: str = "semi-automatic"
) -> dict[str, Any]:
    """Retry a failed or incomplete submission."""
    try:
        result = await submission_orchestrator.retry_submission(
            application_id=application_id,
            mode=mode
        )

        return {
            "status": "success",
            "message": "Submission retried",
            **result
        }

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrying submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/info")
async def get_system_info() -> dict[str, Any]:
    """Get complete system information and capabilities."""
    return {
        "name": "AusGrant-Automate",
        "version": "1.0.0",
        "description": "Complete AI-powered grant application system",
        "phases": {
            "phase_1": "Project Setup - Complete",
            "phase_2": "The Scout (Grant Aggregation) - Complete",
            "phase_3": "The Veteran (AI Grant Writer) - Complete",
            "phase_4": "The Closer (Form Automation) - Complete"
        },
        "capabilities": [
            "Scrape grants from 5 government portals",
            "AI-powered criteria parsing",
            "Organization data management",
            "Generate evidence-based grant applications",
            "Automated form filling with Playwright",
            "Human-in-the-loop verification",
            "Complete submission tracking"
        ],
        "portals": [
            "grants.gov.au",
            "tenders.gov.au",
            "tenders.vic.gov.au",
            "nswbuy.com.au",
            "business.qld.gov.au"
        ],
        "endpoints": {
            "scraping": ["/scrape/federal", "/scrape/all", "/grants"],
            "organizations": ["/organizations"],
            "writing": ["/applications/generate"],
            "submissions": ["/submissions/complete", "/submissions/{id}/status"]
        }
    }
