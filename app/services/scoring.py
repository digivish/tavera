import structlog
from datetime import datetime, timezone

from app.adapters.base import DataSourceAdapter
from app.models import InfractionSeverity, InfractionStatus

logger = structlog.get_logger()

_SEVERITY_WEIGHTS: dict[str, float] = {
    InfractionSeverity.CRITICAL.value: 3.0,
    InfractionSeverity.MODERATE.value: 1.5,
    InfractionSeverity.NON_CRITICAL.value: 0.5,
}

_SEVERITY_MAP: dict[str, str] = {
    "critical": InfractionSeverity.CRITICAL.value,
    "high": InfractionSeverity.CRITICAL.value,
    "moderate": InfractionSeverity.MODERATE.value,
    "medium": InfractionSeverity.MODERATE.value,
    "low": InfractionSeverity.NON_CRITICAL.value,
    "non_critical": InfractionSeverity.NON_CRITICAL.value,
    "minor": InfractionSeverity.NON_CRITICAL.value,
}

_MAX_PENALTY = 40.0  # maximum score deduction from infractions
_WINDOW_MONTHS = 24  # lookback window for infractions


def _normalize_severity(raw: str) -> str:
    return _SEVERITY_MAP.get(raw.lower().strip(), InfractionSeverity.NON_CRITICAL.value)


def _calculate_penalty(infraction_count: int, severity: str) -> float:
    weight = _SEVERITY_WEIGHTS.get(severity, 0.5)
    return weight * min(infraction_count, 10)


def calculate_score(
    infractions_by_source: dict[str, list[dict]],
    total_sources: int = 3,
) -> tuple[float | None, int, int]:
    """
    Calculate unified risk score from infraction data.
    Returns (score, sources_available, sources_total).

    Score is 100 - penalty. Higher = safer.
    A supplier with zero infractions scores 100.
    A supplier with many critical infractions can drop to 60.
    """
    if not infractions_by_source:
        return None, 0, total_sources

    # 24-month lookback with correct year-boundary handling
    now = datetime.now(timezone.utc)
    month = now.month - _WINDOW_MONTHS
    year = now.year
    while month <= 0:
        month += 12
        year -= 1
    cutoff = now.replace(year=year, month=month)

    total_penalty = 0.0
    sources_available = 0

    for _source, infractions in infractions_by_source.items():
        sources_available += 1
        severity_counts: dict[str, int] = {}
        for inf in infractions:
            reported = inf.get("reported_date")
            if isinstance(reported, str):
                reported = datetime.fromisoformat(reported)
            if reported and reported < cutoff:
                continue
            sev = _normalize_severity(inf.get("severity", "non_critical"))
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        for sev, count in severity_counts.items():
            total_penalty += _calculate_penalty(count, sev)

    penalty = min(total_penalty, _MAX_PENALTY)
    score = round(100.0 - penalty, 1)
    return score, sources_available, total_sources


def score_to_risk_level(score: float | None) -> str:
    """Map numeric score to risk level label."""
    if score is None:
        return "unknown"
    if score >= 85:
        return "low"
    if score >= 65:
        return "moderate"
    return "high"
