import structlog
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import WebhookSubscription

logger = structlog.get_logger()


async def deliver_webhook(
    db: AsyncSession,
    event: str,
    payload: dict,
    client: httpx.AsyncClient | None = None,
) -> dict[str, int]:
    """Deliver a webhook event to all active subscriptions. Returns {succeeded: N, failed: N}."""
    result = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.is_active == True,
            WebhookSubscription.events.contains(event),
        )
    )
    subscriptions = result.scalars().all()

    if not subscriptions:
        return {"succeeded": 0, "failed": 0}

    if client is None:
        client = httpx.AsyncClient(timeout=15)

    succeeded = 0
    failed = 0

    for sub in subscriptions:
        try:
            response = await client.post(
                sub.url,
                json={"event": event, "payload": payload, "timestamp": datetime.now(timezone.utc).isoformat()},
                headers={"X-Tavera-Signature": settings.webhook_signing_secret},
            )
            if response.status_code < 400:
                sub.failure_count = 0
                succeeded += 1
            else:
                sub.failure_count += 1
                sub.last_failure_at = datetime.now(timezone.utc)
                failed += 1
                logger.warning("webhook_non_2xx", url=sub.url[:80], status=response.status_code)
        except httpx.TimeoutException:
            sub.failure_count += 1
            sub.last_failure_at = datetime.now(timezone.utc)
            failed += 1
            logger.warning("webhook_timeout", url=sub.url[:80])
        except Exception:
            sub.failure_count += 1
            sub.last_failure_at = datetime.now(timezone.utc)
            failed += 1
            logger.exception("webhook_delivery_failed", url=sub.url[:80])

    await db.flush()
    logger.info("webhook_delivery_batch", event=event, succeeded=succeeded, failed=failed)
    return {"succeeded": succeeded, "failed": failed}
