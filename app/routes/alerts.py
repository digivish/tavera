import structlog
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import get_db
from app.middleware.api_key import verify_api_key
from app.models import ApiKey, Infraction, Supplier, SupplierStatus, WebhookSubscription
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
        select(Supplier).where(Supplier.status == SupplierStatus.FLAGGED)
    )
    suppliers = result.scalars().all()
    return {
        "count": len(suppliers),
        "suppliers": [
            {
                "id": str(s.id),
                "legal_name": s.legal_name,
                "unified_score": s.unified_score,
                "status": s.status.value,
            }
            for s in suppliers
        ],
    }


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
