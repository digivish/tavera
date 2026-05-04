import csv
import io
import pytest
from uuid import uuid4

from app.services.csv_import import process_csv, _sanitize_cell, MAX_SIZE_BYTES, MAX_ROWS
from app.models import Supplier, SupplierStatus


class TestSanitizeCell:
    def test_strips_formula_equal(self):
        assert _sanitize_cell("=cmd|'calc'") == "'=cmd|'calc'"

    def test_strips_formula_at(self):
        assert _sanitize_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"

    def test_strips_formula_plus(self):
        assert _sanitize_cell("+1+2") == "'+1+2"

    def test_strips_formula_minus(self):
        assert _sanitize_cell("-1+2") == "'-1+2"

    def test_passes_normal_text(self):
        assert _sanitize_cell("Fraser Valley Logistics") == "Fraser Valley Logistics"

    def test_passes_empty(self):
        assert _sanitize_cell("") == ""


@pytest.mark.asyncio
class TestCsvImport:
    async def test_valid_csv_imports_rows(self, db_session):
        csv_content = "legal_name,dba,duns\nFraser Valley Logistics,FVL,123456789\nOceanic Distribution,Seafood Direct,987654321\n"
        result = await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content.encode("utf-8"),
            candidate_names=[],
        )
        assert result.imported == 2
        assert result.failed == 0

    async def test_missing_required_column(self, db_session):
        csv_content = "name,dba\nFraser Valley,FVL\n"
        with pytest.raises(ValueError, match="Missing required columns"):
            await process_csv(
                db=db_session,
                user_id=uuid4(),
                file_content=csv_content.encode("utf-8"),
                candidate_names=[],
            )

    async def test_empty_file_raises(self, db_session):
        with pytest.raises(ValueError, match="empty"):
            await process_csv(
                db=db_session,
                user_id=uuid4(),
                file_content=b"",
                candidate_names=[],
            )

    async def test_file_too_large_raises(self, db_session):
        big_content = b"x" * (MAX_SIZE_BYTES + 1)
        with pytest.raises(ValueError, match="MB limit"):
            await process_csv(
                db=db_session,
                user_id=uuid4(),
                file_content=big_content,
                candidate_names=[],
            )

    async def test_row_with_short_name_fails(self, db_session):
        csv_content = "legal_name,dba\nF,Too Short\nValid Name,OK\n"
        result = await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content.encode("utf-8"),
            candidate_names=[],
        )
        assert result.imported == 1
        assert result.failed == 1
        assert "min 2 chars" in result.errors[0]["error"]

    async def test_row_limit_exceeded(self, db_session):
        rows = ["legal_name,dba"] + [f"Supplier {i},DBA {i}" for i in range(MAX_ROWS + 10)]
        csv_content = "\n".join(rows)
        result = await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content.encode("utf-8"),
            candidate_names=[],
        )
        assert result.failed > 0
        assert "Row limit" in result.errors[0]["error"]

    async def test_fuzzy_match_applied(self, db_session):
        csv_content = "legal_name,dba\nFraser Valley Logistics Ltd,FVL\n"
        candidates = ["Fraser Valley Logistics Limited"]
        result = await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content.encode("utf-8"),
            candidate_names=candidates,
        )
        assert result.imported == 1

    async def test_supplier_status_mapped_on_match(self, db_session):
        csv_content = "legal_name,dba\nFraser Valley Logistics Ltd,FVL\n"
        candidates = ["Fraser Valley Logistics Limited"]
        await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content.encode("utf-8"),
            candidate_names=candidates,
        )

    async def test_formula_injection_sanitized(self, db_session):
        csv_content = 'legal_name,dba\n=cmd|\'calc\'|A1,Test\n'
        result = await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content.encode("utf-8"),
            candidate_names=[],
        )
        assert result.imported == 1

    async def test_bom_encoding_handled(self, db_session):
        # UTF-8 BOM is common in Excel-exported CSVs
        bom = b'\xef\xbb\xbf'
        csv_content = bom + b"legal_name,dba\nFraser Valley,FVL\n"
        result = await process_csv(
            db=db_session,
            user_id=uuid4(),
            file_content=csv_content,
            candidate_names=[],
        )
        assert result.imported == 1
