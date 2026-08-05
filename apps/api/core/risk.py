"""Authentication risk scoring.

Pure, deterministic and synchronous: no I/O happens in here. The caller gathers
the signals and this module only weighs them, which is what makes the scoring
testable rule by rule and keeps a slow query out of the login path.

**Nothing here blocks anything.** The score is recorded and shown in Console.
`AUTH_RISK_BLOCK_THRESHOLD` defaults to 0, meaning enforcement is off, and it
must stay off until the score has been observed against real traffic — a
scoring rule that looks sensible can still be wrong often enough to lock real
users out of their accounts.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

MAX_SCORE = 100

NEW_DEVICE_POINTS = 15
NEW_COUNTRY_POINTS = 20
BOT_POINTS = 30
UNTRUSTED_CONTEXT_POINTS = 10
IDENTIFIER_BURST_POINTS = 20
IP_BURST_POINTS = 25
SHARED_DEVICE_POINTS = 25
IMPOSSIBLE_TRAVEL_POINTS = 35

IDENTIFIER_BURST_THRESHOLD = 3
IP_BURST_THRESHOLD = 10
SHARED_DEVICE_THRESHOLD = 3
IMPOSSIBLE_TRAVEL_KMH = 800.0

EARTH_RADIUS_KM = 6371.0


@dataclass(frozen=True)
class RiskInput:
    is_new_device: bool = False
    is_new_country_for_user: bool = False
    is_bot: bool = False
    context_trusted: bool = True
    recent_failures_for_identifier: int = 0
    recent_failures_for_ip: int = 0
    distinct_users_on_device: int = 1
    minutes_since_last_attempt_elsewhere: int | None = None
    km_from_last_attempt: float | None = None


@dataclass(frozen=True)
class RiskAssessment:
    score: int
    reasons: list[str] = field(default_factory=list)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def distance_between(
    lat1: str | None, lon1: str | None, lat2: str | None, lon2: str | None
) -> float | None:
    """Distance between two stored coordinate pairs, or None if any is missing.

    Coordinates are stored as strings to preserve precision, so this is where
    they are parsed — and a malformed pair yields None rather than raising,
    because a geo lookup that returned junk must not fail a login.
    """
    if not (lat1 and lon1 and lat2 and lon2):
        return None
    try:
        return haversine_km(float(lat1), float(lon1), float(lat2), float(lon2))
    except (TypeError, ValueError):
        return None


def implied_speed_kmh(km: float | None, minutes: int | None) -> float | None:
    """Speed implied by two consecutive attempts, or None when undefined.

    Zero elapsed minutes with real distance is treated as infinite speed rather
    than a division error: two attempts from different continents in the same
    minute is the clearest possible signal, not an edge case to discard.
    """
    if km is None or minutes is None or km <= 0:
        return None
    if minutes <= 0:
        return math.inf
    return km / (minutes / 60)


def assess_risk(signal: RiskInput) -> RiskAssessment:
    """Weighs the gathered signals. Deterministic, and clamped to 0-100."""
    score = 0
    reasons: list[str] = []

    if signal.is_new_device:
        score += NEW_DEVICE_POINTS
        reasons.append("new_device")

    if signal.is_new_country_for_user:
        score += NEW_COUNTRY_POINTS
        reasons.append("new_country")

    if signal.is_bot:
        score += BOT_POINTS
        reasons.append("bot_user_agent")

    if not signal.context_trusted:
        score += UNTRUSTED_CONTEXT_POINTS
        reasons.append("untrusted_context")

    if signal.recent_failures_for_identifier >= IDENTIFIER_BURST_THRESHOLD:
        score += IDENTIFIER_BURST_POINTS
        reasons.append("identifier_failure_burst")

    if signal.recent_failures_for_ip >= IP_BURST_THRESHOLD:
        score += IP_BURST_POINTS
        reasons.append("ip_failure_burst")

    if signal.distinct_users_on_device >= SHARED_DEVICE_THRESHOLD:
        score += SHARED_DEVICE_POINTS
        reasons.append("shared_device")

    speed = implied_speed_kmh(signal.km_from_last_attempt, signal.minutes_since_last_attempt_elsewhere)
    if speed is not None and speed > IMPOSSIBLE_TRAVEL_KMH:
        score += IMPOSSIBLE_TRAVEL_POINTS
        reasons.append("impossible_travel")

    return RiskAssessment(score=min(score, MAX_SCORE), reasons=reasons)


def should_block(score: int, threshold: int) -> bool:
    """Whether a score blocks, given the configured threshold.

    A threshold of 0 — the default and the only supported production value
    today — never blocks, whatever the score. Enabling enforcement is a config
    change, not a code change, which is the whole point of routing it through
    this single guard.
    """
    if threshold <= 0:
        return False
    return score >= threshold
