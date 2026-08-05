"""Failure-isolated recording of authentication context and device snapshots."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from core.request_context import resolve_request_context
from core.timestamps import now_unix_seconds
from core.user_agent import parse_user_agent, refine_with_client_hints
from db.repositories.auth_attempts import AuthAttemptRepository
from db.repositories.user_devices import UserDeviceRepository
from db.session import get_db

logger = get_logger(__name__)


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


def _decode_signal(value: str | None) -> _Signal | None:
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
            signal = _decode_signal(ctx.device_signal)
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
                request_id=ctx.request_id,
                created_at=now,
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


async def get_auth_telemetry_service(db: Annotated[AsyncSession, Depends(get_db)]) -> AuthTelemetryService:
    return AuthTelemetryService(db)


AuthTelemetryDep = Annotated[AuthTelemetryService, Depends(get_auth_telemetry_service)]
