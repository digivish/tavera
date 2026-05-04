import csv
import io
import structlog
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Supplier, SupplierStatus
from app.schemas.supplier import CsvImportResult
from app.services.mapping import fuzzy_match, resolve_aliases

logger = structlog.get_logger()

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
MAX_ROWS = 5000
REQUIRED_COLUMNS = {"legal_name"}

# Characters that indicate Excel formula injection — stripped from cell values
_FORMULA_LEADERS = ("=", "@", "+", "-")


def _sanitize_cell(value: str) -> str:
    v = value.strip()
    if v and v[0] in _FORMULA_LEADERS:
        return "'" + v
    return v


async def process_csv(
    db: AsyncSession,
    user_id: UUID,
    file_content: bytes,
    candidate_names: list[str],
) -> CsvImportResult:
    if len(file_content) > MAX_SIZE_BYTES:
        raise ValueError(f"File exceeds {MAX_SIZE_BYTES // (1024*1024)}MB limit")

    text = file_content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV file is empty")

    missing = REQUIRED_COLUMNS - set(c.lower() for c in reader.fieldnames if c)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    imported = 0
    failed = 0
    errors: list[dict] = []

    for row_num, row in enumerate(reader, start=2):  # 2 = first data row after header
        if row_num > MAX_ROWS + 1:
            errors.append({"row": row_num, "error": "Row limit exceeded"})
            failed += 1
            continue

        legal_name = _sanitize_cell(row.get("legal_name", "") or row.get("Legal Name", ""))
        if not legal_name or len(legal_name) < 2:
            errors.append({"row": row_num, "error": "legal_name is required (min 2 chars)"})
            failed += 1
            continue

        dba = _sanitize_cell(row.get("dba", "") or row.get("DBA", "") or "")
        duns = (_sanitize_cell(row.get("duns", "") or row.get("DUNS", "") or "")).strip() or None
        facility_id = (_sanitize_cell(row.get("facility_id", "") or row.get("Facility ID", "") or "")).strip() or None

        # Entity resolution
        match_name = await resolve_aliases(db, legal_name)
        confidence = 1.0 if match_name else None
        if not match_name and candidate_names:
            match_name, confidence = fuzzy_match(legal_name, candidate_names)

        supplier = Supplier(
            user_id=user_id,
            legal_name=legal_name,
            dba=dba or None,
            duns=duns,
            facility_id=facility_id,
            status=SupplierStatus.MAPPED if match_name else SupplierStatus.IMPORTED,
            orgbook_match_confidence=confidence,
        )
        db.add(supplier)
        imported += 1

    await db.flush()
    logger.info("csv_import_complete", imported=imported, failed=failed, user_id=str(user_id))
    return CsvImportResult(imported=imported, failed=failed, errors=errors)
