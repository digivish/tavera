from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class InfractionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    source: str
    infraction_type: str
    description: str | None
    severity: str
    status: str
    action_taken: str | None
    reported_date: datetime


class SupplierOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    legal_name: str
    dba: str | None
    duns: str | None
    facility_id: str | None
    health_authority: str | None
    parent_organization: str | None
    registered_entity: str | None
    address: str | None
    status: str
    unified_score: float | None
    score_sources_available: int
    score_sources_total: int
    score_last_updated: datetime | None
    orgbook_match_confidence: float | None
    created_at: datetime
    updated_at: datetime


class SupplierDetail(SupplierOut):
    infractions: list[InfractionOut] = []


class SupplierListOut(BaseModel):
    suppliers: list[SupplierOut]
    total: int
    page: int
    page_size: int


class CsvImportRow(BaseModel):
    legal_name: str = Field(min_length=2, max_length=500)
    dba: str | None = Field(default=None, max_length=500)
    duns: str | None = Field(default=None, max_length=20)
    facility_id: str | None = Field(default=None, max_length=100)


class CsvImportResult(BaseModel):
    imported: int
    failed: int
    errors: list[dict] = []
