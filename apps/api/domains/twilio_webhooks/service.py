from __future__ import annotations

import hashlib
import json

from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.repositories.communications import CommunicationRepository

_STATUS_RANK = {"queued": 10, "accepted": 10, "sent": 20, "delivered": 30, "read": 40}
_TERMINAL = {"failed", "undelivered"}
_CALL_STATUS_RANK = {"queued": 10, "initiated": 20, "ringing": 30, "in-progress": 40, "completed": 50}
_CALL_TERMINAL = {"completed", "busy", "no-answer", "canceled", "failed"}


def payload_hash(payload: dict[str, str]) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def should_apply_status(current: str, incoming: str) -> bool:
    """Reject lower-rank updates and any change after a terminal outcome."""
    if current in _TERMINAL:
        return False
    if incoming in _TERMINAL:
        return True
    return _STATUS_RANK.get(incoming, 0) >= _STATUS_RANK.get(current, 0)


def should_apply_call_status(current: str, incoming: str) -> bool:
    """Reject lower-rank updates and all updates after a terminal call state."""
    if current in _CALL_TERMINAL:
        return False
    if incoming in _CALL_TERMINAL:
        return True
    return _CALL_STATUS_RANK.get(incoming, 0) >= _CALL_STATUS_RANK.get(current, 0)


class TwilioWebhookService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._repo = CommunicationRepository(db)

    async def apply_message_status(self, payload: dict[str, str]) -> bool:
        provider_sid = payload.get("MessageSid") or payload.get("SmsSid") or ""
        if not provider_sid:
            return False
        digest = payload_hash(payload)
        if await self._repo.get_webhook_event(
            provider_sid=provider_sid, event_type="message.status", payload_hash=digest
        ):
            return False
        now = now_unix_seconds()
        event = await self._repo.create_webhook_event(
            id=generate_id("webhookEvent"),
            provider="twilio",
            event_type="message.status",
            provider_sid=provider_sid,
            payload_hash=digest,
            signature_valid=True,
            processed_at=now,
            processing_error=None,
            created_at=now,
        )
        message = await self._repo.get_message_by_provider_sid(provider_sid)
        incoming = payload.get("MessageStatus", "").lower()
        if message and incoming and should_apply_status(message.status, incoming):
            message.status = incoming
            message.updated_at = now
            if incoming == "delivered":
                message.delivered_at = now
            elif incoming == "read":
                message.read_at = now
            elif incoming in _TERMINAL:
                message.failed_at = now
                message.provider_error_code = payload.get("ErrorCode") or None
        await self._db.flush()
        return event is not None

    async def apply_call_status(self, payload: dict[str, str]) -> bool:
        provider_sid = payload.get("CallSid") or ""
        if not provider_sid:
            return False
        digest = payload_hash(payload)
        if await self._repo.get_webhook_event(provider_sid=provider_sid, event_type="call.status", payload_hash=digest):
            return False
        now = now_unix_seconds()
        event = await self._repo.create_webhook_event(
            id=generate_id("webhookEvent"),
            provider="twilio",
            event_type="call.status",
            provider_sid=provider_sid,
            payload_hash=digest,
            signature_valid=True,
            processed_at=now,
            processing_error=None,
            created_at=now,
        )
        call = await self._repo.get_call_by_provider_sid(provider_sid)
        incoming = payload.get("CallStatus", "").lower()
        if call and incoming and should_apply_call_status(call.status, incoming):
            call.status = incoming
            call.updated_at = now
            if incoming in {"initiated", "ringing", "in-progress"} and call.started_at is None:
                call.started_at = now
            if incoming == "completed":
                call.completed_at = now
                duration = _positive_int(payload.get("CallDuration"))
                if duration is not None:
                    call.duration_seconds = duration
                    call.answered_at = _callback_timestamp(payload.get("AnsweredAt")) or max(0, now - duration)
            elif incoming in _CALL_TERMINAL:
                call.completed_at = now
                call.provider_error_code = payload.get("ErrorCode") or None
        await self._db.flush()
        return event is not None

    async def record_inbound_call(self, payload: dict[str, str]) -> bool:
        provider_sid = payload.get("CallSid") or ""
        if not provider_sid:
            return False
        digest = payload_hash(payload)
        if await self._repo.get_webhook_event(
            provider_sid=provider_sid, event_type="call.inbound", payload_hash=digest
        ):
            return False
        now = now_unix_seconds()
        await self._repo.create_webhook_event(
            id=generate_id("webhookEvent"),
            provider="twilio",
            event_type="call.inbound",
            provider_sid=provider_sid,
            payload_hash=digest,
            signature_valid=True,
            processed_at=now,
            processing_error=None,
            created_at=now,
        )
        await self._db.flush()
        return True


def _positive_int(value: str | None) -> int | None:
    try:
        parsed = int(value or "")
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


def _callback_timestamp(value: str | None) -> int | None:
    return _positive_int(value)
