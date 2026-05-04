"""
Daily cron job: check all monitored suppliers for new infractions,
update scores, and fire webhook alerts for status changes.

Usage: python scripts/cron_alert_pipeline.py
"""
import asyncio
import structlog
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.fraser_health import FraserHealthAdapter
from app.adapters.vch import VCHAdapter
from app.main import async_session
from app.models import Infraction, InfractionSeverity, InfractionStatus, Supplier, SupplierStatus
from app.services.scoring import calculate_score, score_to_risk_level
from app.services.webhooks import deliver_webhook

logger = structlog.get_logger()


async def run_alert_pipeline():
    fraser = FraserHealthAdapter()
    vch = VCHAdapter()

    async with async_session() as db:
        # Fetch all monitored and active suppliers
        result = await db.execute(
            select(Supplier).where(
                Supplier.status.in_([SupplierStatus.MONITORED, SupplierStatus.ACTIVE, SupplierStatus.FLAGGED])
            )
        )
        suppliers = result.scalars().all()
        logger.info("alert_pipeline_start", supplier_count=len(suppliers))

        for supplier in suppliers:
            sources_data: dict[str, list[dict]] = {}

            # Fetch Fraser Health infractions
            try:
                raw = await fraser.fetch()
                normalized = fraser.normalize(raw)
                matching = [
                    n for n in normalized
                    if n.supplier_name and n.supplier_name.lower() == supplier.legal_name.lower()
                ]
                if matching:
                    sources_data["Fraser Health"] = [
                        {"severity": n.severity, "reported_date": n.reported_date.isoformat()}
                        for n in matching
                    ]
                    # Persist new infractions
                    for n in matching:
                        inf = Infraction(
                            supplier_id=supplier.id,
                            source=n.source,
                            infraction_type=n.infraction_type,
                            description=n.description,
                            severity=InfractionSeverity(n.severity),
                            status=InfractionStatus.ACTIVE,
                            action_taken=n.action_taken,
                            reported_date=n.reported_date,
                        )
                        db.add(inf)
            except Exception:
                logger.warning("pipeline_source_failed", supplier=supplier.legal_name, source="Fraser Health")

            # Fetch VCH infractions
            try:
                raw = await vch.fetch()
                normalized = vch.normalize(raw)
                matching = [
                    n for n in normalized
                    if n.supplier_name and n.supplier_name.lower() == supplier.legal_name.lower()
                ]
                if matching:
                    sources_data["VCH"] = [
                        {"severity": n.severity, "reported_date": n.reported_date.isoformat()}
                        for n in matching
                    ]
                    for n in matching:
                        inf = Infraction(
                            supplier_id=supplier.id,
                            source=n.source,
                            infraction_type=n.infraction_type,
                            description=n.description,
                            severity=InfractionSeverity(n.severity),
                            status=InfractionStatus.ACTIVE,
                            action_taken=n.action_taken,
                            reported_date=n.reported_date,
                        )
                        db.add(inf)
            except Exception:
                logger.warning("pipeline_source_failed", supplier=supplier.legal_name, source="VCH")

            # Recalculate score
            old_score = supplier.unified_score
            score, available, total = calculate_score(sources_data)
            supplier.unified_score = score
            supplier.score_sources_available = available
            supplier.score_sources_total = total
            supplier.score_last_updated = datetime.now(timezone.utc)

            # Auto-flag if score drops below threshold
            if score is not None and score < 50 and supplier.status != SupplierStatus.FLAGGED:
                supplier.status = SupplierStatus.FLAGGED
                logger.info("supplier_auto_flagged", supplier=supplier.legal_name, score=score)

            # Fire webhook if status changed
            if supplier.status == SupplierStatus.FLAGGED:
                try:
                    await deliver_webhook(
                        db,
                        event="supplier.flagged",
                        payload={
                            "supplier_id": str(supplier.id),
                            "legal_name": supplier.legal_name,
                            "unified_score": score,
                            "previous_score": old_score,
                        },
                    )
                except Exception:
                    logger.exception("webhook_fire_failed", supplier=supplier.legal_name)

        await db.commit()
        logger.info("alert_pipeline_complete", supplier_count=len(suppliers))


if __name__ == "__main__":
    asyncio.run(run_alert_pipeline())
