import structlog
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.fraser_health import FraserHealthAdapter
from app.adapters.orgbook_bc import OrgBookBCAdapter
from app.adapters.vch import VCHAdapter
from app.main import get_db
from app.middleware.api_key import verify_api_key
from app.models import ApiKey, Infraction, InfractionSeverity, InfractionStatus, Supplier, SupplierStatus
from app.schemas.supplier import SupplierDetail, SupplierListOut, SupplierOut, CsvImportResult
from app.services.csv_import import process_csv
from app.services.scoring import calculate_score, score_to_risk_level

logger = structlog.get_logger()
router = APIRouter(prefix="/suppliers", tags=["suppliers"])

ApiKeyAuth = Annotated[ApiKey, Depends(verify_api_key)]


@router.get("/", response_model=SupplierListOut)
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=15, le=100),
    status: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
):
    query = select(Supplier)
    count_query = select(func.count(Supplier.id))

    if status:
        query = query.where(Supplier.status == status)
        count_query = count_query.where(Supplier.status == status)

    if search:
        query = query.where(Supplier.legal_name.ilike(f"%{search}%"))
        count_query = count_query.where(Supplier.legal_name.ilike(f"%{search}%"))

    # Apply risk_level filter post-query since it's derived
    if risk_level:
        # Fetch all, filter in-memory: simple for MVP
        result = await db.execute(query)
        all_suppliers = result.scalars().all()
        filtered = [s for s in all_suppliers if score_to_risk_level(s.unified_score) == risk_level]
        total = len(filtered)
        start = (page - 1) * page_size
        suppliers = filtered[start : start + page_size]
        return SupplierListOut(
            suppliers=[SupplierOut.model_validate(s) for s in suppliers],
            total=total,
            page=page,
            page_size=page_size,
        )

    # Apply sorting
    sort_col = getattr(Supplier, sort_by, Supplier.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query)
    suppliers = result.scalars().all()

    return SupplierListOut(
        suppliers=[SupplierOut.model_validate(s) for s in suppliers],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{supplier_id}", response_model=SupplierDetail)
async def get_supplier(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    return SupplierDetail.model_validate(supplier)


@router.post("/import", response_model=CsvImportResult)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="File must be a .csv")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    # Get entity name candidates from OrgBook BC for fuzzy matching
    candidate_names: list[str] = []
    try:
        orgbook = OrgBookBCAdapter()
        candidate_names = await orgbook.get_entity_names()
    except Exception:
        logger.warning("orgbook_unavailable_during_import", filename=file.filename)

    try:
        result = await process_csv(
            db=db,
            user_id=uuid4(),  # Placeholder until auth is wired
            file_content=content,
            candidate_names=candidate_names,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{supplier_id}/score")
async def refresh_score(
    supplier_id: UUID,
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")

    # Fetch infractions from all sources for this supplier's name
    fraser = FraserHealthAdapter()
    vch = VCHAdapter()

    sources_data: dict[str, list[dict]] = {}

    try:
        raw_fraser = await fraser.fetch()
        normalized_fraser = fraser.normalize(raw_fraser)
        fraser_for_supplier = [
            {"severity": n.severity, "reported_date": n.reported_date.isoformat()}
            for n in normalized_fraser
            if n.supplier_name and n.supplier_name.lower() == supplier.legal_name.lower()
        ]
        if fraser_for_supplier:
            sources_data["Fraser Health"] = fraser_for_supplier
    except Exception:
        logger.warning("fraser_health_fetch_failed", supplier_id=str(supplier_id))

    try:
        raw_vch = await vch.fetch()
        normalized_vch = vch.normalize(raw_vch)
        vch_for_supplier = [
            {"severity": n.severity, "reported_date": n.reported_date.isoformat()}
            for n in normalized_vch
            if n.supplier_name and n.supplier_name.lower() == supplier.legal_name.lower()
        ]
        if vch_for_supplier:
            sources_data["VCH"] = vch_for_supplier
    except Exception:
        logger.warning("vch_fetch_failed", supplier_id=str(supplier_id))

    score, available, total = calculate_score(sources_data)
    supplier.unified_score = score
    supplier.score_sources_available = available
    supplier.score_sources_total = total
    supplier.score_last_updated = func.now()

    await db.commit()
    await db.refresh(supplier)

    return {
        "supplier_id": str(supplier_id),
        "unified_score": score,
        "sources_available": available,
        "sources_total": total,
        "risk_level": score_to_risk_level(score),
    }


@router.get("/compare")
async def compare_suppliers(
    ids: str = Query(description="Comma-separated supplier UUIDs, max 4"),
    db: AsyncSession = Depends(get_db),
    _api_key: ApiKeyAuth = None,
):
    id_list = [UUID(i.strip()) for i in ids.split(",") if i.strip()]
    if len(id_list) > 4:
        raise HTTPException(status_code=422, detail="Maximum 4 suppliers for comparison")

    result = await db.execute(select(Supplier).where(Supplier.id.in_(id_list)))
    suppliers = result.scalars().all()

    return {
        "suppliers": [
            {
                **SupplierDetail.model_validate(s).model_dump(),
                "risk_level": score_to_risk_level(s.unified_score),
            }
            for s in suppliers
        ]
    }
