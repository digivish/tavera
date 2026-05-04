import pytest
from datetime import datetime, timezone, timedelta
from app.services.scoring import calculate_score, score_to_risk_level


class TestCalculateScore:
    def test_no_data_returns_none(self):
        score, available, total = calculate_score({})
        assert score is None
        assert available == 0
        assert total == 3

    def test_zero_infractions_scores_100(self):
        score, available, total = calculate_score({"Fraser Health": []})
        assert score == 100.0
        assert available == 1

    def test_single_non_critical_modest_penalty(self):
        data = {
            "Fraser Health": [
                {"severity": "non_critical", "reported_date": datetime.now(timezone.utc).isoformat()}
            ]
        }
        score, available, total = calculate_score(data)
        assert score is not None and score < 100
        assert score >= 90  # Single non-critical is minor

    def test_critical_infraction_significant_penalty(self):
        data = {
            "VCH": [
                {"severity": "critical", "reported_date": datetime.now(timezone.utc).isoformat()}
            ]
        }
        score, available, total = calculate_score(data)
        assert score is not None
        assert score < 100

    def test_multiple_infractions_accumulate_penalty(self):
        data = {
            "Fraser Health": [
                {"severity": "critical", "reported_date": datetime.now(timezone.utc).isoformat()},
                {"severity": "moderate", "reported_date": datetime.now(timezone.utc).isoformat()},
                {"severity": "non_critical", "reported_date": datetime.now(timezone.utc).isoformat()},
            ]
        }
        score_a, _, _ = calculate_score(data)
        score_b, _, _ = calculate_score({"Fraser Health": [
            {"severity": "non_critical", "reported_date": datetime.now(timezone.utc).isoformat()}
        ]})
        assert score_a is not None and score_b is not None
        assert score_a < score_b  # More infractions = worse score

    def test_old_infractions_excluded(self):
        old_date = (datetime.now(timezone.utc) - timedelta(days=800)).isoformat()
        data = {
            "Fraser Health": [
                {"severity": "critical", "reported_date": old_date}
            ]
        }
        score, _, _ = calculate_score(data)
        assert score == 100.0  # Old infraction ignored

    def test_partial_sources_reported(self):
        data = {"Fraser Health": []}
        score, available, total = calculate_score(data)
        assert available == 1
        assert total == 3

    def test_score_floor(self):
        # 100 critical infractions should still score at least 60
        data = {
            "Fraser Health": [
                {"severity": "critical", "reported_date": datetime.now(timezone.utc).isoformat()}
                for _ in range(100)
            ]
        }
        score, _, _ = calculate_score(data)
        assert score is not None and score >= 60

    def test_severity_case_insensitive(self):
        data = {
            "Fraser Health": [
                {"severity": "CRITICAL", "reported_date": datetime.now(timezone.utc).isoformat()}
            ]
        }
        score, _, _ = calculate_score(data)
        assert score is not None and score < 100

    def test_unknown_severity_defaults_to_non_critical(self):
        data = {
            "Fraser Health": [
                {"severity": "unknown_label", "reported_date": datetime.now(timezone.utc).isoformat()}
            ]
        }
        score, _, _ = calculate_score(data)
        assert score is not None  # shouldn't crash


class TestScoreToRiskLevel:
    def test_high_score_is_low_risk(self):
        assert score_to_risk_level(90) == "low"

    def test_boundary_85(self):
        assert score_to_risk_level(85) == "low"

    def test_boundary_65(self):
        assert score_to_risk_level(65) == "moderate"

    def test_moderate_range(self):
        assert score_to_risk_level(75) == "moderate"

    def test_high_risk(self):
        assert score_to_risk_level(50) == "high"

    def test_none_is_unknown(self):
        assert score_to_risk_level(None) == "unknown"

    def test_zero_is_high_risk(self):
        assert score_to_risk_level(0) == "high"
