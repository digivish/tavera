import structlog
from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SupplierAlias

logger = structlog.get_logger()

# Common legal entity suffix variants
_SUFFIX_ALIASES: dict[str, str] = {
    "ltd": "limited",
    "ltd.": "limited",
    "limited": "limited",
    "corp": "corporation",
    "corp.": "corporation",
    "corporation": "corporation",
    "inc": "incorporated",
    "inc.": "incorporated",
    "incorporated": "incorporated",
    "llc": "llc",
    "llp": "llp",
    "l.p.": "lp",
    "lp": "lp",
    "co": "company",
    "co.": "company",
    "company": "company",
}


def _normalize_name(name: str) -> str:
    """Lowercase, strip punctuation, normalize suffixes for comparison."""
    import re

    name = name.lower().strip()
    name = re.sub(r"[.,#&]", " ", name)
    parts = name.split()
    normalized_parts = [_SUFFIX_ALIASES.get(p, p) for p in parts]
    return " ".join(normalized_parts)


def fuzzy_match(query: str, candidates: list[str], threshold: int = 75) -> tuple[str | None, float]:
    """
    Match a query name against a list of candidate names using token sort ratio.
    Returns (best_match, confidence) or (None, 0.0) if no match exceeds threshold.
    """
    query_norm = _normalize_name(query)
    best_score = 0.0
    best_match = None

    for candidate in candidates:
        candidate_norm = _normalize_name(candidate)
        score = fuzz.token_sort_ratio(query_norm, candidate_norm)
        if score > best_score:
            best_score = score
            best_match = candidate

    if best_score >= threshold and best_match is not None:
        confidence = best_score / 100.0
        logger.debug("fuzzy_match_hit", query=query, match=best_match, score=best_score)
        return best_match, confidence

    logger.debug("fuzzy_match_miss", query=query, best_score=best_score)
    return None, 0.0


async def resolve_aliases(db: AsyncSession, name: str) -> str | None:
    """Check the manual alias table for a known canonical name."""
    result = await db.execute(
        select(SupplierAlias.canonical_name).where(
            SupplierAlias.known_name.ilike(name.strip())
        )
    )
    row = result.scalar_one_or_none()
    if row:
        logger.debug("alias_resolved", known_name=name, canonical=row)
    return row
