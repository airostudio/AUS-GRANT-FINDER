"""Organization management service for storing company/org data."""

import logging
from typing import Any
import asyncpg

logger = logging.getLogger(__name__)


class OrganizationService:
    """Service for managing organization data and capabilities."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        """Create database connection pool."""
        try:
            self.pool = await asyncpg.create_pool(self.database_url)
            logger.info("Organization service connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    async def disconnect(self) -> None:
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Organization service disconnected")

    async def create_organization(
        self, org_data: dict[str, Any]
    ) -> str:
        """Create a new organization."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                org_id = await conn.fetchval(
                    """
                    INSERT INTO "Organization" (
                        name, abn, industry, "yearsInOperation", employees,
                        revenue, location, description, achievements,
                        capabilities, "previousGrants", "createdAt", "updatedAt"
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
                    )
                    RETURNING id
                    """,
                    org_data.get("name"),
                    org_data.get("abn"),
                    org_data.get("industry"),
                    org_data.get("years_in_operation", 0),
                    org_data.get("employees"),
                    org_data.get("revenue"),
                    org_data.get("location"),
                    org_data.get("description"),
                    org_data.get("achievements", []),
                    org_data.get("capabilities", []),
                    org_data.get("previous_grants", []),
                )

                logger.info(f"Created organization: {org_data.get('name')}")
                return org_id

        except Exception as e:
            logger.error(f"Error creating organization: {e}")
            raise

    async def get_organization(self, org_id: str) -> dict[str, Any] | None:
        """Retrieve an organization by ID."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    'SELECT * FROM "Organization" WHERE id = $1',
                    org_id,
                )

                if row:
                    return dict(row)
                return None

        except Exception as e:
            logger.error(f"Error retrieving organization: {e}")
            raise

    async def get_organization_by_abn(
        self, abn: str
    ) -> dict[str, Any] | None:
        """Retrieve an organization by ABN."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    'SELECT * FROM "Organization" WHERE abn = $1',
                    abn,
                )

                if row:
                    return dict(row)
                return None

        except Exception as e:
            logger.error(f"Error retrieving organization by ABN: {e}")
            raise

    async def update_organization(
        self, org_id: str, updates: dict[str, Any]
    ) -> bool:
        """Update an organization's data."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                # Build dynamic update query
                set_clauses = []
                values = []
                param_count = 1

                for key, value in updates.items():
                    if key in [
                        "name",
                        "industry",
                        "employees",
                        "revenue",
                        "location",
                        "description",
                        "achievements",
                        "capabilities",
                        "previousGrants",
                    ]:
                        # Convert snake_case to camelCase for database
                        db_key = key
                        if key == "previous_grants":
                            db_key = "previousGrants"
                        elif key == "years_in_operation":
                            db_key = "yearsInOperation"

                        set_clauses.append(f'"{db_key}" = ${param_count}')
                        values.append(value)
                        param_count += 1

                if not set_clauses:
                    return False

                # Add updatedAt
                set_clauses.append('"updatedAt" = NOW()')

                # Add org_id as last parameter
                values.append(org_id)

                query = f"""
                    UPDATE "Organization"
                    SET {', '.join(set_clauses)}
                    WHERE id = ${param_count}
                """

                result = await conn.execute(query, *values)

                updated = result.split()[-1] if result else "0"
                logger.info(f"Updated organization {org_id}: {updated} rows")
                return int(updated) > 0

        except Exception as e:
            logger.error(f"Error updating organization: {e}")
            raise

    async def add_achievement(
        self, org_id: str, achievement: str
    ) -> bool:
        """Add an achievement to an organization."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            org = await self.get_organization(org_id)
            if not org:
                return False

            achievements = org.get("achievements", [])
            if isinstance(achievements, str):
                import json
                achievements = json.loads(achievements)

            achievements.append(achievement)

            return await self.update_organization(
                org_id, {"achievements": achievements}
            )

        except Exception as e:
            logger.error(f"Error adding achievement: {e}")
            raise

    async def add_capability(
        self, org_id: str, capability: str
    ) -> bool:
        """Add a capability to an organization."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            org = await self.get_organization(org_id)
            if not org:
                return False

            capabilities = org.get("capabilities", [])
            if isinstance(capabilities, str):
                import json
                capabilities = json.loads(capabilities)

            capabilities.append(capability)

            return await self.update_organization(
                org_id, {"capabilities": capabilities}
            )

        except Exception as e:
            logger.error(f"Error adding capability: {e}")
            raise

    async def list_organizations(
        self, limit: int = 100
    ) -> list[dict[str, Any]]:
        """List all organizations."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT * FROM "Organization"
                    ORDER BY "createdAt" DESC
                    LIMIT $1
                    """,
                    limit,
                )

                return [dict(row) for row in rows]

        except Exception as e:
            logger.error(f"Error listing organizations: {e}")
            raise

    async def delete_organization(self, org_id: str) -> bool:
        """Delete an organization."""
        if not self.pool:
            raise RuntimeError("Database not connected")

        try:
            async with self.pool.acquire() as conn:
                result = await conn.execute(
                    'DELETE FROM "Organization" WHERE id = $1',
                    org_id,
                )

                deleted = result.split()[-1] if result else "0"
                logger.info(f"Deleted organization {org_id}")
                return int(deleted) > 0

        except Exception as e:
            logger.error(f"Error deleting organization: {e}")
            raise
