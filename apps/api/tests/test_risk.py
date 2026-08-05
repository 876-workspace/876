"""Authentication risk scoring.

Each rule is tested in isolation so a weight change shows up as exactly one
failure, plus the clamp and — most importantly — that the default threshold
never blocks.
"""

from __future__ import annotations

import math

import pytest

from core.risk import (
    IMPOSSIBLE_TRAVEL_KMH,
    MAX_SCORE,
    RiskInput,
    assess_risk,
    distance_between,
    haversine_km,
    implied_speed_kmh,
    should_block,
)


class TestIndividualRules:
    def test_a_clean_attempt_scores_zero(self) -> None:
        assessment = assess_risk(RiskInput())

        assert assessment.score == 0
        assert assessment.reasons == []

    @pytest.mark.parametrize(
        ("signal", "points", "reason"),
        [
            (RiskInput(is_new_device=True), 15, "new_device"),
            (RiskInput(is_new_country_for_user=True), 20, "new_country"),
            (RiskInput(is_bot=True), 30, "bot_user_agent"),
            (RiskInput(context_trusted=False), 10, "untrusted_context"),
            (RiskInput(recent_failures_for_identifier=3), 20, "identifier_failure_burst"),
            (RiskInput(recent_failures_for_ip=10), 25, "ip_failure_burst"),
            (RiskInput(distinct_users_on_device=3), 25, "shared_device"),
            (
                RiskInput(km_from_last_attempt=5000.0, minutes_since_last_attempt_elsewhere=60),
                35,
                "impossible_travel",
            ),
        ],
    )
    def test_each_rule_contributes_its_own_weight(self, signal: RiskInput, points: int, reason: str) -> None:
        assessment = assess_risk(signal)

        assert assessment.score == points
        assert assessment.reasons == [reason]


class TestThresholds:
    def test_two_failures_for_an_identifier_is_below_the_burst_threshold(self) -> None:
        assert assess_risk(RiskInput(recent_failures_for_identifier=2)).score == 0

    def test_nine_failures_from_an_ip_is_below_the_burst_threshold(self) -> None:
        assert assess_risk(RiskInput(recent_failures_for_ip=9)).score == 0

    def test_two_users_on_a_device_is_not_a_shared_device(self) -> None:
        assert assess_risk(RiskInput(distinct_users_on_device=2)).score == 0

    def test_travel_at_the_threshold_speed_does_not_score(self) -> None:
        """800 km/h is a plausible flight; the rule fires strictly above it."""
        signal = RiskInput(km_from_last_attempt=IMPOSSIBLE_TRAVEL_KMH, minutes_since_last_attempt_elsewhere=60)

        assert assess_risk(signal).score == 0


class TestAccumulation:
    def test_reasons_accumulate_with_the_score(self) -> None:
        assessment = assess_risk(
            RiskInput(is_new_device=True, is_new_country_for_user=True, context_trusted=False)
        )

        assert assessment.score == 45
        assert assessment.reasons == ["new_device", "new_country", "untrusted_context"]

    def test_the_score_is_clamped_at_one_hundred(self) -> None:
        assessment = assess_risk(
            RiskInput(
                is_new_device=True,
                is_new_country_for_user=True,
                is_bot=True,
                context_trusted=False,
                recent_failures_for_identifier=50,
                recent_failures_for_ip=50,
                distinct_users_on_device=9,
                km_from_last_attempt=9000.0,
                minutes_since_last_attempt_elsewhere=5,
            )
        )

        assert assessment.score == MAX_SCORE
        assert len(assessment.reasons) == 8


class TestGeoHelpers:
    def test_measures_a_known_distance(self) -> None:
        # Kingston to Miami is roughly 930 km.
        km = haversine_km(17.99702, -76.79358, 25.7617, -80.1918)

        assert 900 < km < 960

    def test_distance_is_zero_for_the_same_point(self) -> None:
        assert haversine_km(17.99702, -76.79358, 17.99702, -76.79358) == pytest.approx(0.0)

    @pytest.mark.parametrize(
        ("lat1", "lon1", "lat2", "lon2"),
        [
            (None, "-76.79", "25.76", "-80.19"),
            ("17.99", None, "25.76", "-80.19"),
            ("17.99", "-76.79", None, "-80.19"),
            ("17.99", "-76.79", "25.76", None),
            ("not-a-number", "-76.79", "25.76", "-80.19"),
        ],
    )
    def test_returns_none_for_a_missing_or_malformed_coordinate(
        self, lat1: str | None, lon1: str | None, lat2: str | None, lon2: str | None
    ) -> None:
        assert distance_between(lat1, lon1, lat2, lon2) is None

    def test_parses_stored_string_coordinates(self) -> None:
        km = distance_between("17.99702", "-76.79358", "25.7617", "-80.1918")

        assert km is not None and 900 < km < 960


class TestImpliedSpeed:
    def test_computes_speed_from_distance_and_elapsed_minutes(self) -> None:
        assert implied_speed_kmh(600.0, 60) == pytest.approx(600.0)

    def test_treats_zero_elapsed_minutes_as_infinite(self) -> None:
        """Two continents in the same minute is the clearest signal there is."""
        assert implied_speed_kmh(5000.0, 0) == math.inf

    @pytest.mark.parametrize(("km", "minutes"), [(None, 60), (500.0, None), (0.0, 60)])
    def test_is_undefined_without_both_inputs(self, km: float | None, minutes: int | None) -> None:
        assert implied_speed_kmh(km, minutes) is None


class TestEnforcement:
    def test_the_default_threshold_never_blocks(self) -> None:
        """The assertion that lets scoring ship without risking a lockout."""
        assert should_block(MAX_SCORE, 0) is False

    def test_a_negative_threshold_never_blocks(self) -> None:
        assert should_block(MAX_SCORE, -1) is False

    def test_blocks_at_or_above_a_configured_threshold(self) -> None:
        assert should_block(60, 60) is True
        assert should_block(75, 60) is True

    def test_does_not_block_below_a_configured_threshold(self) -> None:
        assert should_block(59, 60) is False

    def test_a_maximum_score_still_authenticates_with_the_default(self) -> None:
        assessment = assess_risk(
            RiskInput(
                is_new_device=True,
                is_new_country_for_user=True,
                is_bot=True,
                context_trusted=False,
                recent_failures_for_identifier=99,
                recent_failures_for_ip=99,
                distinct_users_on_device=9,
            )
        )

        assert assessment.score == MAX_SCORE
        assert should_block(assessment.score, 0) is False
