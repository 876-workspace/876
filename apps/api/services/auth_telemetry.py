"""Failure-isolated recording of authentication context and device snapshots."""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.logging import get_logger
from core.request_context import resolve_request_context
from core.risk import RiskAssessment, RiskInput, assess_risk, distance_between
from core.timestamps import now_unix_seconds
from core.user_agent import parse_user_agent, refine_with_client_hints
from db.repositories.auth_attempts import AuthAttemptRepository
from db.repositories.user_devices import UserDeviceRepository
from db.session import get_db
from providers.posthog.client import capture_event

logger = get_logger(__name__)

# Failure bursts are counted over this window; short enough that a burst means
# an active run rather than a user who has forgotten a password twice today.
RISK_WINDOW_SECONDS = 15 * 60


def _hash_ip(ip: str | None) -> str | None:
    """A stable, salted digest of an IP for analytics.

    Analytics gets correlation without ever receiving the address itself. The
    salt is the identification pepper when configured, so the digest cannot be
    reversed by rainbow table against the small IPv4 space.
    """
    if not ip:
        return None
    salt = get_settings().identification_hash_pepper or "876"
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:16]


class _Signal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    visitorId: str = Field(min_length=1, max_length=128)
    confidence: str = "low"
    hints: dict[str, Any] | None = None
    components: dict[str, str] | None = None


@dataclass(frozen=True)
class AttemptContext:
    """The resolved request context, handed back so the caller can stamp the
    same values onto the session row without re-resolving them."""

    ip: str | None
    user_agent: str | None
    country_code: str | None
    region: str | None
    city: str | None
    asn: str | None
    as_organization: str | None


@dataclass(frozen=True)
class AuthAttemptRecord:
    id: str | None
    device_id: str | None
    context: AttemptContext | None = None


def decode_device_signal(value: str | None) -> _Signal | None:
    """Decodes the `x-876-device` blob, or returns None for anything malformed.

    Shared with the identification-disclosure audit trail, which records the
    device a raw identifier was disclosed to.
    """

    if value is None or len(value) > 8192:
        return None
    try:
        padded = value + "=" * (-len(value) % 4)
        return _Signal.model_validate(json.loads(base64.urlsafe_b64decode(padded).decode("utf-8")))
    except Exception:
        return None


class AuthTelemetryService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def record(
        self,
        *,
        request: Request,
        event: str,
        outcome: str,
        identifier: str | None = None,
        user_id: str | None = None,
        app_id: str | None = None,
        session_id: str | None = None,
        failure_code: str | None = None,
    ) -> AuthAttemptRecord:
        try:
            ctx = resolve_request_context(request)
            signal = decode_device_signal(ctx.device_signal)
            parsed = refine_with_client_hints(parse_user_agent(ctx.user_agent), signal.hints if signal else None)
            now = now_unix_seconds()
            device_id: str | None = None
            if user_id and signal:
                signal_data = signal.model_dump(exclude={"components"})
                device = await UserDeviceRepository(self._db).record_seen(
                    user_id=user_id,
                    fingerprint=signal.visitorId,
                    now=now,
                    confidence=signal.confidence,
                    device_type=parsed.device_type,
                    device_brand=parsed.device_brand,
                    device_model=parsed.device_model,
                    os_name=parsed.os_name,
                    os_version=parsed.os_version,
                    browser_name=parsed.browser_name,
                    browser_version=parsed.browser_version,
                    is_bot=parsed.is_bot,
                    last_ip=ctx.ip,
                    last_country_code=ctx.geo.country_code,
                    signal=signal_data,
                )
                device_id = device.id
            assessment = await self._assess(
                user_id=user_id,
                identifier=identifier,
                ctx=ctx,
                parsed_is_bot=parsed.is_bot,
                fingerprint=signal.visitorId if signal else None,
                now=now,
            )

            attempt = await AuthAttemptRepository(self._db).create(
                event=event,
                outcome=outcome,
                failure_code=failure_code,
                identifier=identifier.lower() if identifier else None,
                user_id=user_id,
                app_id=app_id,
                session_id=session_id,
                realm=request.headers.get("x-876-realm"),
                device_id=device_id,
                device_fingerprint=signal.visitorId if signal else None,
                ip_address=ctx.ip,
                ip_country_code=ctx.geo.country_code,
                ip_region_code=ctx.geo.region_code,
                ip_region=ctx.geo.region,
                ip_city=ctx.geo.city,
                ip_postal_code=ctx.geo.postal_code,
                ip_timezone=ctx.geo.timezone,
                ip_latitude=ctx.geo.latitude,
                ip_longitude=ctx.geo.longitude,
                ip_asn=ctx.geo.asn,
                ip_as_organization=ctx.geo.as_organization,
                user_agent=ctx.user_agent,
                device_type=parsed.device_type,
                device_brand=parsed.device_brand,
                device_model=parsed.device_model,
                os_name=parsed.os_name,
                os_version=parsed.os_version,
                browser_name=parsed.browser_name,
                browser_version=parsed.browser_version,
                is_bot=parsed.is_bot,
                context_trusted=ctx.trusted,
                risk_score=assessment.score,
                risk_reasons=assessment.reasons or None,
                request_id=ctx.request_id,
                created_at=now,
            )

            await self._emit(
                event=event,
                outcome=outcome,
                failure_code=failure_code,
                user_id=user_id,
                ctx=ctx,
                parsed=parsed,
                fingerprint=signal.visitorId if signal else None,
                assessment=assessment,
            )
            return AuthAttemptRecord(
                attempt.id,
                device_id,
                AttemptContext(
                    ip=ctx.ip,
                    user_agent=ctx.user_agent,
                    country_code=ctx.geo.country_code,
                    region=ctx.geo.region,
                    city=ctx.geo.city,
                    asn=ctx.geo.asn,
                    as_organization=ctx.geo.as_organization,
                ),
            )
        except Exception:
            logger.warning("auth.telemetry.failed", exc_info=True)
            return AuthAttemptRecord(None, None, None)


    async def _assess(
        self,
        *,
        user_id: str | None,
        identifier: str | None,
        ctx: Any,
        parsed_is_bot: bool,
        fingerprint: str | None,
        now: int,
    ) -> RiskAssessment:
        """Gathers the signals the scorer needs, then scores them.

        All the I/O lives here rather than in `core.risk`, which stays pure and
        therefore testable rule by rule. Every lookup is best-effort: a failed
        query degrades that one signal to its neutral value instead of failing
        the assessment, because a partial score is still useful and a raised
        exception here would cost the whole attempt record.
        """
        window_start = now - RISK_WINDOW_SECONDS
        attempts = AuthAttemptRepository(self._db)

        recent_identifier_failures = 0
        recent_ip_failures = 0
        try:
            if identifier:
                recent_identifier_failures = await attempts.count_recent_failures(
                    identifier=identifier, since=window_start
                )
            if ctx.ip:
                recent_ip_failures = await attempts.count_recent_failures(ip_address=ctx.ip, since=window_start)
        except Exception:
            logger.warning("auth.risk.failure_counts_unavailable", exc_info=True)

        distinct_users = 1
        is_new_device = False
        if fingerprint:
            try:
                devices = await UserDeviceRepository(self._db).list_by_fingerprint(fingerprint)
                distinct_users = len({device.user_id for device in devices}) or 1
                is_new_device = user_id is not None and not any(
                    device.user_id == user_id for device in devices
                )
            except Exception:
                logger.warning("auth.risk.device_lookup_unavailable", exc_info=True)

        is_new_country = False
        km_from_last = None
        minutes_since_last = None
        if user_id and ctx.geo.country_code:
            try:
                previous, _ = await attempts.list(user_id=user_id, limit=1)
                last = previous[0] if previous else None
                if last is not None:
                    is_new_country = (
                        last.ip_country_code is not None and last.ip_country_code != ctx.geo.country_code
                    )
                    km_from_last = distance_between(
                        last.ip_latitude, last.ip_longitude, ctx.geo.latitude, ctx.geo.longitude
                    )
                    minutes_since_last = max(0, (now - last.created_at) // 60)
            except Exception:
                logger.warning("auth.risk.history_unavailable", exc_info=True)

        return assess_risk(
            RiskInput(
                is_new_device=is_new_device,
                is_new_country_for_user=is_new_country,
                is_bot=parsed_is_bot,
                context_trusted=ctx.trusted,
                recent_failures_for_identifier=recent_identifier_failures,
                recent_failures_for_ip=recent_ip_failures,
                distinct_users_on_device=distinct_users,
                minutes_since_last_attempt_elsewhere=minutes_since_last,
                km_from_last_attempt=km_from_last,
            )
        )

    async def _emit(
        self,
        *,
        event: str,
        outcome: str,
        failure_code: str | None,
        user_id: str | None,
        ctx: Any,
        parsed: Any,
        fingerprint: str | None,
        assessment: RiskAssessment,
    ) -> None:
        """Sends the attempt to PostHog, stripped of anything identifying.

        The raw IP and the submitted identifier never leave this process — the
        IP goes as a salted hash so two attempts from one address can still be
        correlated in analytics without the address itself being stored there.
        Fire-and-forget and fully isolated: an analytics outage must never
        affect a login.
        """
        try:
            distinct_id = (
                user_id
                or (f"device:{fingerprint}" if fingerprint else None)
                or (f"anon:{_hash_ip(ctx.ip)}" if ctx.ip else "anon:unknown")
            )
            await capture_event(
                get_settings(),
                distinct_id=distinct_id,
                event="auth_attempt",
                properties={
                    "event": event,
                    "outcome": outcome,
                    "failure_code": failure_code,
                    "realm": None,
                    "country_code": ctx.geo.country_code,
                    "region": ctx.geo.region,
                    "city": ctx.geo.city,
                    "timezone": ctx.geo.timezone,
                    "asn_organization": ctx.geo.as_organization,
                    "ip_hash": _hash_ip(ctx.ip),
                    "device_type": parsed.device_type,
                    "device_brand": parsed.device_brand,
                    "device_model": parsed.device_model,
                    "os_name": parsed.os_name,
                    "os_version": parsed.os_version,
                    "browser_name": parsed.browser_name,
                    "browser_version": parsed.browser_version,
                    "is_bot": parsed.is_bot,
                    "risk_score": assessment.score,
                    "risk_reasons": assessment.reasons,
                    "context_trusted": ctx.trusted,
                    # We supply our own geo; PostHog must not overwrite it from
                    # the IP of the server that sent the event.
                    "$geoip_disable": True,
                },
            )
        except Exception:
            logger.warning("auth.analytics.failed", exc_info=True)


async def get_auth_telemetry_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthTelemetryService:
    return AuthTelemetryService(db)


AuthTelemetryDep = Annotated[AuthTelemetryService, Depends(get_auth_telemetry_service)]
