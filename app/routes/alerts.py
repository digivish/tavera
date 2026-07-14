import structlog
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.main import get_db
from app.middleware.api_key import verify_api_key
from app.models import ApiKey, Infraction, Supplier, SupplierStatus, WebhookSubscription
from app.schemas.supplier import SupplierDetail
from app.services.webhooks import deliver_webhook

logger = structlog.get_logger()
router = APIRouter(prefix="/alerts", tags=["alerts"])

ApiKeyAuth = Annotated[ApiKey, Depends(verify_api_key)]


@router.get("/flagged")
async def list_flagged_suppliers(
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
):
    result = await db.execute(
        select(Supplier)
        .where(Supplier.status == SupplierStatus.FLAGGED)
        .options(selectinload(Supplier.infractions))
    )
    suppliers = result.scalars().all()
    return {
        "count": len(suppliers),
        "suppliers": [SupplierDetail.model_validate(s).model_dump(mode="json") for s in suppliers],
    }


@router.get("/recent")
async def recent_infractions(
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
    limit: int = 10,
):
    """Recent infractions across all suppliers, newest first."""
    from app.schemas.supplier import InfractionOut

    result = await db.execute(
        select(Infraction)
        .order_by(Infraction.reported_date.desc())
        .limit(limit)
    )
    infractions = result.scalars().all()

    # Load supplier names in one query
    supplier_ids = [i.supplier_id for i in infractions]
    if supplier_ids:
        sup_result = await db.execute(
            select(Supplier).where(Supplier.id.in_(supplier_ids))
        )
        suppliers = {s.id: s for s in sup_result.scalars().all()}
    else:
        suppliers = {}

    return [
        {
            **InfractionOut.model_validate(inf).model_dump(mode="json"),
            "supplier_name": suppliers[inf.supplier_id].legal_name if inf.supplier_id in suppliers else "Unknown",
            "health_authority": suppliers[inf.supplier_id].health_authority if inf.supplier_id in suppliers else None,
        }
        for inf in infractions
    ]


@router.post("/webhooks")
async def create_webhook(
    url: str,
    events: str = "supplier.flagged",
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
):
    """Register a new webhook subscription."""
    if not url.startswith("https://"):
        raise HTTPException(status_code=422, detail="Webhook URL must use HTTPS")

    # SSRF prevention: reject private/local IPs
    from urllib.parse import urlparse
    import ipaddress

    parsed = urlparse(url)
    if parsed.hostname:
        try:
            addr = ipaddress.ip_address(parsed.hostname)
            if addr.is_private or addr.is_loopback or addr.is_link_local:
                raise HTTPException(status_code=422, detail="Webhook URL must be publicly routable")
        except ValueError:
            pass  # hostname is a domain name, not an IP — fine

    sub = WebhookSubscription(
        user_id=_api_key.user_id,
        url=url,
        events=events,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    logger.info("webhook_created", url=url[:80], events=events)
    return {"id": str(sub.id), "url": sub.url, "events": sub.events, "is_active": sub.is_active}
