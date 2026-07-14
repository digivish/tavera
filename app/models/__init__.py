import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class SupplierStatus(str, enum.Enum):
    IMPORTED = "imported"
    MAPPED = "mapped"
    ACTIVE = "active"
    FLAGGED = "flagged"
    MONITORED = "monitored"
    ARCHIVED = "archived"


class InfractionSeverity(str, enum.Enum):
    CRITICAL = "critical"
    MODERATE = "moderate"
    NON_CRITICAL = "non_critical"


class InfractionStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"
    RESOLVED = "resolved"
    ACTIVE = "active"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    organization_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    legal_name: Mapped[str] = mapped_column(String(500), nullable=False)
    dba: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duns: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    facility_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    health_authority: Mapped[str | None] = mapped_column(String(100), nullable=True)
    parent_organization: Mapped[str | None] = mapped_column(String(500), nullable=True)
    registered_entity: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SupplierStatus] = mapped_column(
        Enum(SupplierStatus), default=SupplierStatus.IMPORTED, nullable=False
    )
    unified_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    score_sources_available: Mapped[int] = mapped_column(Integer, default=0)
    score_sources_total: Mapped[int] = mapped_column(Integer, default=3)
    score_last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    orgbook_match_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    infractions: Mapped[list["Infraction"]] = relationship(back_populates="supplier", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Supplier {self.legal_name} [{self.status.value}]>"


class Infraction(Base):
    __tablename__ = "infractions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    infraction_type: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[InfractionSeverity] = mapped_column(Enum(InfractionSeverity), nullable=False)
    status: Mapped[InfractionStatus] = mapped_column(
        Enum(InfractionStatus), default=InfractionStatus.ACTIVE, nullable=False
    )
    action_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supplier: Mapped[Supplier] = relationship(back_populates="infractions")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    scopes: Mapped[str] = mapped_column(String(255), default="read", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    events: Mapped[str] = mapped_column(String(255), default="supplier.flagged", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    last_failure_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SupplierAlias(Base):
    __tablename__ = "supplier_aliases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    known_name: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    canonical_name: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
