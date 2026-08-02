"""Business rules for canonical user mobile numbers and provider-owned checks."""

from __future__ import annotations

import re
from typing import Literal

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.id import generate_id
from core.rate_limit import enforce_rate_limit
from core.timestamps import now_unix_seconds
from db.models import User, UserMobileNumber, Verification
from db.repositories.audit_events import AuditEventRepository
from db.repositories.mobile_numbers import MobileNumberRepository
from providers.communications import PhoneVerificationProvider
from providers.twilio import get_phone_verification_provider
from providers.twilio.errors import channel_disabled, not_configured

from .schemas import verification_metadata_send_count

_E164 = re.compile(r"^\+[1-9][0-9]{7,14}$")
_CHANNEL_FLAGS = {
    "sms": "twilio_verify_sms_enabled",
    "call": "twilio_verify_call_enabled",
    "whatsapp": "twilio_verify_whatsapp_enabled",
}
_RESEND_COOLDOWN_SECONDS = 60
_VERIFICATION_TTL_SECONDS = 600
_MAX_CHECK_ATTEMPTS = 5


def normalize_phone_number(value: str) -> str:
    """Normalize the same international E.164-compatible inputs as `@876/core`."""
    stripped = value.strip()
    if not stripped.startswith("+") or not re.fullmatch(r"\+?[\d\s().-]+", stripped):
        raise _invalid_phone()
    digits = re.sub(r"\D", "", stripped)
    normalized = f"+{digits}"
    if not _E164.fullmatch(normalized):
        raise _invalid_phone()
    return normalized


def _invalid_phone() -> AppHTTPException:
    return AppHTTPException(
        code="communications/invalid-phone-number",
        message="Enter a valid international phone number.",
        http_status_code=status.HTTP_400_BAD_REQUEST,
    )


def _verification_error(code: str, message: str, http_status: int = status.HTTP_400_BAD_REQUEST) -> AppHTTPException:
    return AppHTTPException(code=code, message=message, http_status_code=http_status)


class MobileNumberService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        settings: Settings | None = None,
        provider: PhoneVerificationProvider | None = None,
    ) -> None:
        self._db = db
        self._repo = MobileNumberRepository(db)
        self._settings = settings or get_settings()
        self._provider = provider or get_phone_verification_provider(self._settings)

    async def create(self, *, user_id: str, number: str, number_type: str) -> UserMobileNumber:
        normalized = normalize_phone_number(number)
        if await self._repo.get_by_number(user_id=user_id, number=normalized):
            raise _verification_error(
                "communications/number-already-used",
                "This phone number is already on your account.",
                409,
            )
        now = now_unix_seconds()
        return await self._repo.create(
            id=generate_id("mobileNumber"),
            user_id=user_id,
            number=normalized,
            type=number_type,
            is_primary=False,
            verification_status="unverified",
            created_at=now,
            updated_at=now,
        )

    async def list(self, *, user_id: str) -> list[UserMobileNumber]:
        return await self._repo.list(user_id=user_id)

    async def retrieve(self, *, user_id: str, mobile_number_id: str) -> UserMobileNumber:
        return await self._require_mobile_number(user_id=user_id, mobile_number_id=mobile_number_id)

    async def update(self, *, user_id: str, mobile_number_id: str, number_type: str | None) -> UserMobileNumber:
        row = await self._require_mobile_number(user_id=user_id, mobile_number_id=mobile_number_id)
        return await self._repo.update(row, type=number_type or row.type, updated_at=now_unix_seconds())

    async def delete(self, *, user_id: str, mobile_number_id: str) -> None:
        row = await self._require_mobile_number(user_id=user_id, mobile_number_id=mobile_number_id)
        if row.is_primary:
            user = await self._db.get(User, user_id)
            if user:
                user.phone = None
                user.phone_verified = False
                user.updated_at = now_unix_seconds()
        await self._repo.delete(row)

    async def create_verification(
        self,
        *,
        user_id: str,
        mobile_number_id: str,
        channel: Literal["sms", "call", "whatsapp"],
    ) -> Verification:
        row = await self._require_mobile_number(user_id=user_id, mobile_number_id=mobile_number_id)
        if self._settings.twilio_mode != "fake" and not self._settings.twilio_live_enabled:
            raise not_configured()
        self._require_channel(channel)
        enforce_rate_limit("communications.verify.send.user", user_id, max_attempts=5, window_seconds=24 * 60 * 60)
        enforce_rate_limit("communications.verify.send.number", row.number, max_attempts=5, window_seconds=24 * 60 * 60)

        now = now_unix_seconds()
        previous = (
            await self._repo.get_verification(verification_id=row.verification_id)
            if row.verification_id
            else None
        )
        if previous and previous.can_resend_at and previous.can_resend_at > now:
            raise _verification_error(
                "communications/verification-pending",
                "A verification was sent recently. Please wait before requesting another.",
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
        send_count = verification_metadata_send_count(previous.metadata_ if previous else None)
        if send_count >= 5:
            raise _verification_error(
                "communications/rate-limited",
                "Too many verification messages have been sent.",
                status.HTTP_429_TOO_MANY_REQUESTS,
            )

        provider_result = await self._provider.create_verification(to_number=row.number, channel=channel)
        verification = await self._repo.create_verification(
            id=generate_id("verification"),
            identifier=row.number,
            value="",
            type="phone",
            expires_at=now + _VERIFICATION_TTL_SECONDS,
            provider=provider_result.provider,
            provider_sid=provider_result.provider_sid,
            subject_type="mobile_number",
            subject_id=row.id,
            channel=channel,
            status=provider_result.status,
            attempt_count=0,
            last_sent_at=now,
            can_resend_at=now + _RESEND_COOLDOWN_SECONDS,
            metadata_={"send_count": send_count + 1},
            created_at=now,
            updated_at=now,
        )
        await self._repo.update(
            row,
            verification_id=verification.id,
            verification_status="pending",
            updated_at=now,
        )
        await self._audit(user_id=user_id, event="mobile_number.verification_sent", properties={"channel": channel})
        return verification

    async def approve_verification(
        self,
        *,
        user_id: str,
        mobile_number_id: str,
        verification_id: str,
        code: str,
        make_primary: bool,
    ) -> Verification:
        row = await self._require_mobile_number(user_id=user_id, mobile_number_id=mobile_number_id)
        verification = await self._require_verification(row=row, verification_id=verification_id)
        now = now_unix_seconds()
        if verification.expires_at <= now:
            verification.status = "expired"
            verification.updated_at = now
            await self._db.commit()
            raise _verification_error("communications/verification-expired", "The verification has expired.")
        if (verification.attempt_count or 0) >= _MAX_CHECK_ATTEMPTS:
            verification.status = "failed"
            verification.updated_at = now
            await self._db.commit()
            raise _verification_error(
                "communications/max-attempts-reached",
                "Too many verification attempts.",
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
        enforce_rate_limit(
            "communications.verify.check.user",
            user_id,
            max_attempts=_MAX_CHECK_ATTEMPTS,
            window_seconds=600,
        )
        enforce_rate_limit(
            "communications.verify.check.number",
            row.number,
            max_attempts=_MAX_CHECK_ATTEMPTS,
            window_seconds=600,
        )

        provider_result = await self._provider.approve_verification(to_number=row.number, code=code)
        verification.attempt_count = (verification.attempt_count or 0) + 1
        verification.status = provider_result.status
        verification.updated_at = now
        if provider_result.status != "approved":
            if provider_result.status == "expired":
                await self._db.commit()
                raise _verification_error("communications/verification-expired", "The verification has expired.")
            if verification.attempt_count >= _MAX_CHECK_ATTEMPTS:
                verification.status = "failed"
                await self._db.commit()
                raise _verification_error(
                    "communications/max-attempts-reached",
                    "Too many verification attempts.",
                    status.HTTP_429_TOO_MANY_REQUESTS,
                )
            await self._db.commit()
            raise _verification_error("communications/verification-failed", "The verification code is incorrect.")

        # The request transaction commits all four updates together: provider approval,
        # canonical number, primary projection, and audit record. No OTP is persisted.
        verification.verified_at = now
        row.verification_status = "verified"
        row.verified_at = now
        if make_primary:
            await self._repo.clear_primary(user_id=user_id)
            row.is_primary = True
        if row.is_primary:
            user = await self._db.get(User, user_id)
            if user is not None:
                user.phone = row.number
                user.phone_verified = True
                user.updated_at = now
        await self._db.flush()
        await self._audit(
            user_id=user_id,
            event="mobile_number.verification_approved",
            properties={"channel": verification.channel},
        )
        return verification

    async def make_primary(self, *, user_id: str, mobile_number_id: str) -> UserMobileNumber:
        row = await self._require_mobile_number(user_id=user_id, mobile_number_id=mobile_number_id)
        if row.verification_status != "verified" or row.verified_at is None:
            raise _verification_error(
                "communications/number-not-verified",
                "Verify this phone number before making it primary.",
            )
        now = now_unix_seconds()
        await self._repo.clear_primary(user_id=user_id)
        row.is_primary = True
        row.updated_at = now
        user = await self._db.get(User, user_id)
        if user is not None:
            user.phone = row.number
            user.phone_verified = True
            user.updated_at = now
        await self._db.flush()
        return row

    def _require_channel(self, channel: str) -> None:
        enabled = getattr(self._settings, _CHANNEL_FLAGS[channel])
        if not enabled:
            raise channel_disabled(channel)

    async def _require_mobile_number(self, *, user_id: str, mobile_number_id: str) -> UserMobileNumber:
        row = await self._repo.get(user_id=user_id, mobile_number_id=mobile_number_id)
        if row is None:
            raise _verification_error(
                "communications/invalid-phone-number",
                "The mobile number was not found.",
                status.HTTP_404_NOT_FOUND,
            )
        return row

    async def _require_verification(self, *, row: UserMobileNumber, verification_id: str) -> Verification:
        if row.verification_id != verification_id:
            raise _verification_error(
                "communications/verification-failed",
                "The verification was not found.",
                status.HTTP_404_NOT_FOUND,
            )
        verification = await self._repo.get_verification(verification_id=verification_id)
        if verification is None or verification.subject_id != row.id or verification.subject_type != "mobile_number":
            raise _verification_error(
                "communications/verification-failed",
                "The verification was not found.",
                status.HTTP_404_NOT_FOUND,
            )
        return verification

    async def _audit(self, *, user_id: str, event: str, properties: dict[str, object]) -> None:
        await AuditEventRepository(self._db).create(
            id=generate_id("auditEvent"),
            event=event,
            source="api",
            app_name="api",
            app_id=None,
            user_id=user_id,
            path=None,
            search=None,
            referrer=None,
            title=None,
            request_id=None,
            session_id=None,
            distinct_id=None,
            properties=properties,
            created_at=now_unix_seconds(),
        )
