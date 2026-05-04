import structlog
from datetime import datetime
from typing import override

import httpx

from app.adapters.base import DataSourceAdapter, RawInfraction
from app.config import settings

logger = structlog.get_logger()


class OrgBookBCAdapter(DataSourceAdapter):
    """Adapter for OrgBook BC — verifiable organization registry.

    OrgBook BC provides legal entity data (names, DUNS numbers, registration status)
    for businesses operating in British Columbia. This is used as the source of truth
    for entity resolution, not for health infractions.
    """

    source_name: str = "OrgBook BC"

    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.orgbook_bc_api_url,
                timeout=settings.external_api_timeout,
            )
        return self._client

    async def search_entity(self, name: str) -> list[dict]:
        """Search for a legal entity by name. Returns list of matching records."""
        try:
            response = await self.client.get(
                "/search/legal-entities",
                params={"q": name, "inactive": "false"},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except httpx.TimeoutException:
            logger.warning("orgbook_timeout", name=name)
            raise
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("orgbook_rate_limited", name=name)
            raise
        except Exception:
            logger.exception("orgbook_unexpected_error", name=name)
            raise

    async def get_entity_names(self) -> list[str]:
        """Fetch all active entity names for fuzzy matching. Used to build candidate list."""
        try:
            response = await self.client.get(
                "/search/legal-entities",
                params={"inactive": "false", "page_size": 500},
            )
            response.raise_for_status()
            data = response.json()
            return [r.get("legal_name", "") for r in data.get("results", []) if r.get("legal_name")]
        except Exception:
            logger.exception("orgbook_fetch_names_failed")
            return []

    async def fetch(self, since: datetime | None = None) -> list[RawInfraction]:
        """OrgBook BC does not contain infraction data. Returns empty list."""
        return []

    def normalize(self, raw: list[RawInfraction]) -> list:
        return []

    async def health_check(self) -> bool:
        try:
            response = await self.client.get("/search/legal-entities", params={"q": "test", "page_size": 1})
            return response.status_code < 500
        except Exception:
            logger.warning("orgbook_health_check_failed")
            return False
