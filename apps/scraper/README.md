# AusGrant Scraper

Python-based scraper for Australian government grant and tender portals.

## Features

- Scrapes Federal, State, and Local government portals
- FastAPI REST API for triggering scrapes
- AI-powered parsing of grant criteria and eligibility
- Stores data in PostgreSQL with pgvector

## Target Portals

### Federal
- GrantConnect (grants.gov.au)
- AusTender (tenders.gov.au)

### State
- Victoria: tenders.vic.gov.au
- NSW: nswbuy.com.au
- Queensland: qld.gov.au/grants
- South Australia: sa.gov.au/grants
- Western Australia: wa.gov.au/grants
- Tasmania: tas.gov.au/grants

## Setup

```bash
# Install dependencies
poetry install

# Install Playwright browsers
poetry run playwright install

# Run the API
poetry run uvicorn src.api.main:app --reload
```

## API Endpoints

- `GET /health` - Health check
- `POST /scrape/federal` - Trigger Federal portal scrape
- `POST /scrape/state/{state}` - Trigger State portal scrape
- `GET /grants` - List all scraped grants
- `GET /grants/{id}` - Get grant details
