import structlog
from datetime import datetime
from typing import override

import httpx

from app.adapters.base import DataSourceAdapter, NormalizedInfraction, RawInfraction
from app.config import settings

logger = structlog.get_logger()

_SEVERITY_MAP = {
    "high": "critical",
    "moderate": "moderate",
    "low": "non_critical",
    "critical": "critical",
}


class VCHAdapter(DataSourceAdapter):
    """Adapter for Vancouver Coastal Health — food safety inspection records."""

    source_name: str = "VCH"

    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.vch_api_url,
                timeout=settings.external_api_timeout,
            )
        return self._client

    async def fetch(self, since: datetime | None = None) -> list[RawInfraction]:
        if not settings.vch_api_url:
            logger.warning("vch_not_configured")
            return []

        params = {}
        if since:
            params["since"] = since.isoformat()

        try:
            response = await self.client.get("/inspections", params=params)
            response.raise_for_status()
            data = response.json()
        except httpx.TimeoutException:
            logger.warning("vch_timeout")
            raise
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("vch_rate_limited")
            raise
        except Exception:
            logger.exception("vch_unexpected_error")
            raise

        results: list[RawInfraction] = []
        records = data if isinstance(data, list) else data.get("results", [])
        for record in records:
            try:
                results.append(RawInfraction(
                    source=self.source_name,
                    infraction_type=record.get("infraction_type", record.get("type", "Unknown")),
                    description=record.get("description", record.get("details")),
                    severity=record.get("severity", record.get("risk_level", "low")),
                    action_taken=record.get("action", record.get("action_taken")),
                    reported_date=datetime.fromisoformat(
                        record.get("inspection_date", record.get("date", ""))
                    ),
                    facility_name=record.get("facility_name", record.get("establishment")),
                    facility_address=record.get("facility_address", record.get("address")),
                ))
            except (ValueError, KeyError) as e:
                logger.warning("vch_parse_row_failed", error=str(e))

        return results

    def normalize(self, raw: list[RawInfraction]) -> list[NormalizedInfraction]:
        results: list[NormalizedInfraction] = []
        for r in raw:
            try:
                sev = _SEVERITY_MAP.get(r.severity.lower().strip(), "non_critical")
                results.append(NormalizedInfraction(
                    source=r.source,
                    infraction_type=r.infraction_type,
                    description=r.description,
                    severity=sev,
                    action_taken=r.action_taken,
                    reported_date=r.reported_date,
                    supplier_name=r.facility_name,
                    facility_address=r.facility_address,
                ))
            except Exception:
                logger.warning("vch_normalize_failed", infraction_type=r.infraction_type)
        return results

    async def health_check(self) -> bool:
        if not settings.vch_api_url:
            return False
        try:
            response = await self.client.get("/inspections", params={"page_size": 1})
            return response.status_code < 500
        except Exception:
            logger.warning("vch_health_check_failed")
            return False
