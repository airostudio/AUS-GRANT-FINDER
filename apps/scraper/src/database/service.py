"""Database service for storing and retrieving grant data."""

import logging
from datetime import datetime
from typing import Any
import asyncpg

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for interacting with PostgreSQL database."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        """Create database connection pool."""
        try:
            self.pool = await asyncpg.create_pool(self.database_url)
            logger.info("Database connection pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create database connection pool: {e}")
            raise

    async def disconnect(self) -> None:
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    async def upsert_grant(self, grant_data: dict[str, Any]) -> str | None:
        """Insert or update a grant in the database."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                # Check if grant already exists by external_id and portal
                existing = await conn.fetchrow(
                    """
                    SELECT id FROM "Grant"
                    WHERE "externalId" = $1 AND portal = $2
                    """,
                    grant_data.get("external_id"),
                    grant_data.get("portal"),
                )

                criteria_json = grant_data.get("criteria", [])

                if existing:
                    # Update existing grant
                    grant_id = existing["id"]
                    await conn.execute(
                        """
                        UPDATE "Grant" SET
                            title = $1,
                            description = $2,
                            level = $3,
                            state = $4,
                            department = $5,
                            category = $6,
                            "fundingMin" = $7,
                            "fundingMax" = $8,
                            "openingDate" = $9,
                            "closingDate" = $10,
                            guidelines = $11,
                            eligibility = $12,
                            criteria = $13,
                            url = $14,
                            status = $15,
                            "updatedAt" = NOW()
                        WHERE id = $16
                        """,
                        grant_data.get("title"),
                        grant_data.get("description"),
                        grant_data.get("level"),
                        grant_data.get("state"),
                        grant_data.get("department"),
                        grant_data.get("category", "General"),
                        grant_data.get("funding_min"),
                        grant_data.get("funding_max"),
                        grant_data.get("opening_date"),
                        grant_data.get("closing_date"),
                        grant_data.get("guidelines"),
                        grant_data.get("eligibility"),
                        criteria_json,
                        grant_data.get("url"),
                        grant_data.get("status", "open"),
                        grant_id,
                    )
                    logger.info(f"Updated grant: {grant_data.get('title')}")
                else:
                    # Insert new grant
                    grant_id = await conn.fetchval(
                        """
                        INSERT INTO "Grant" (
                            "externalId", title, description, portal, level, state,
                            department, category, "fundingMin", "fundingMax",
                            "openingDate", "closingDate", guidelines, eligibility,
                            criteria, url, status, "createdAt", "updatedAt"
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
                        )
                        RETURNING id
                        """,
                        grant_data.get("external_id"),
                        grant_data.get("title"),
                        grant_data.get("description"),
                        grant_data.get("portal"),
                        grant_data.get("level"),
                        grant_data.get("state"),
                        grant_data.get("department"),
                        grant_data.get("category", "General"),
                        grant_data.get("funding_min"),
                        grant_data.get("funding_max"),
                        grant_data.get("opening_date"),
                        grant_data.get("closing_date"),
                        grant_data.get("guidelines"),
                        grant_data.get("eligibility"),
                        criteria_json,
                        grant_data.get("url"),
                        grant_data.get("status", "open"),
                    )
                    logger.info(f"Inserted new grant: {grant_data.get('title')}")

                return grant_id

        except Exception as e:
            logger.error(f"Error upserting grant: {e}")
            raise

    async def get_open_grants(
        self, portal: str | None = None, limit: int = 100
    ) -> list[dict[str, Any]]:
        """Retrieve open grants from the database."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                if portal:
                    rows = await conn.fetch(
                        """
                        SELECT * FROM "Grant"
                        WHERE status = 'open' AND portal = $1
                        ORDER BY "closingDate" ASC
                        LIMIT $2
                        """,
                        portal,
                        limit,
                    )
                else:
                    rows = await conn.fetch(
                        """
                        SELECT * FROM "Grant"
                        WHERE status = 'open'
                        ORDER BY "closingDate" ASC
                        LIMIT $1
                        """,
                        limit,
                    )

                grants = [dict(row) for row in rows]
                logger.info(f"Retrieved {len(grants)} open grants")
                return grants

        except Exception as e:
            logger.error(f"Error retrieving grants: {e}")
            raise

    async def close_expired_grants(self) -> int:
        """Mark grants as closed if their closing date has passed."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                result = await conn.execute(
                    """
                    UPDATE "Grant"
                    SET status = 'closed', "updatedAt" = NOW()
                    WHERE status = 'open' AND "closingDate" < NOW()
                    """
                )

                # Extract number of updated rows
                count = int(result.split()[-1]) if result else 0
                logger.info(f"Closed {count} expired grants")
                return count

        except Exception as e:
            logger.error(f"Error closing expired grants: {e}")
            raise

    async def get_grant_statistics(self) -> dict[str, Any]:
        """Get statistics about grants in the database."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                stats = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(*) as total_grants,
                        COUNT(*) FILTER (WHERE status = 'open') as open_grants,
                        COUNT(*) FILTER (WHERE status = 'closed') as closed_grants,
                        COUNT(DISTINCT portal) as unique_portals,
                        COUNT(DISTINCT department) as unique_departments
                    FROM "Grant"
                    """
                )

                return dict(stats) if stats else {}

        except Exception as e:
            logger.error(f"Error retrieving grant statistics: {e}")
            raise
