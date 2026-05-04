from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass
class RawInfraction:
    source: str
    infraction_type: str
    description: str | None
    severity: str  # raw from source — normalized by adapter
    action_taken: str | None
    reported_date: datetime
    facility_name: str | None
    facility_address: str | None


@dataclass
class NormalizedInfraction:
    source: str
    infraction_type: str
    description: str | None
    severity: str  # one of: critical, moderate, non_critical
    action_taken: str | None
    reported_date: datetime
    supplier_name: str | None
    facility_address: str | None


class DataSourceAdapter(Protocol):
    """Protocol for BC health authority data source adapters."""

    @property
    def source_name(self) -> str: ...

    async def fetch(self, since: datetime | None = None) -> list[RawInfraction]:
        """Fetch raw infractions from the source API. Returns empty list on no results."""
        ...

    def normalize(self, raw: list[RawInfraction]) -> list[NormalizedInfraction]:
        """Normalize raw data into the common infraction schema. Skips malformed records."""
        ...

    async def health_check(self) -> bool:
        """Returns True if the source API is reachable and responding."""
        ...
