"""Cost-controlled phone Lookup and server-template-only messaging."""

from __future__ import annotations

import hashlib

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.id import generate_id
from core.lookup_cache import resolve_cached_lookup
from core.phone import normalize_phone_number
from core.timestamps import now_unix_seconds
from db.models import CommunicationMessage, CommunicationPhoneLookup
from db.repositories.communications import CommunicationRepository
from providers.communications import MessagingProvider, PhoneLookupProvider
from providers.twilio import get_messaging_provider, get_phone_lookup_provider
from providers.twilio.errors import channel_disabled

# Body strings and WhatsApp content SIDs are server-owned. Calling applications can
# select a semantic key, but cannot inject arbitrary content or provider identifiers.
TEMPLATES: dict[str, dict[str, str | None]] = {
    "sms.test": {"channel": "sms", "body": "876 test notification", "content_sid": None},
    "whatsapp.test": {"channel": "whatsapp", "body": None, "content_sid": "HX_TEST_TEMPLATE"},
}


def _error(code: str, message: str, http_status: int = status.HTTP_400_BAD_REQUEST) -> AppHTTPException:
    return AppHTTPException(code=code, message=message, http_status_code=http_status)


class CommunicationsService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        settings: Settings | None = None,
        lookup_provider: PhoneLookupProvider | None = None,
        messaging_provider: MessagingProvider | None = None,
    ) -> None:
        self._db = db
        self._repo = CommunicationRepository(db)
        self._settings = settings or get_settings()
        self._lookup_provider = lookup_provider or get_phone_lookup_provider(self._settings)
        self._messaging_provider = messaging_provider or get_messaging_provider(self._settings)

    async def lookup(self, *, number: str, include_line_type: bool) -> CommunicationPhoneLookup:
        return await resolve_cached_lookup(
            repo=self._repo,
            provider=self._lookup_provider,
            settings=self._settings,
            number=normalize_phone_number(number),
            include_line_type=include_line_type,
        )

    async def create_message(
        self,
        *,
        to_number: str,
        channel: str,
        template_key: str,
        idempotency_key: str,
        user_id: str | None,
        organization_id: str | None,
        app_id: str | None,
        client_reference: str | None,
    ) -> CommunicationMessage:
        template = TEMPLATES.get(template_key)
        if template is None or template["channel"] != channel:
            raise _error("communications/invalid-template", "The requested message template is unavailable.")

        idempotency_scope = app_id or organization_id or user_id or "platform"
        existing = await self._repo.get_message_by_idempotency(scope=idempotency_scope, key=idempotency_key)
        if existing:
            return existing
        if not getattr(self._settings, f"twilio_{channel}_enabled"):
            raise channel_disabled(channel)

        number = normalize_phone_number(to_number)
        body = template["body"]
        content_sid = template["content_sid"]
        body_hash = hashlib.sha256((body or content_sid or "").encode()).hexdigest()
        now = now_unix_seconds()
        row = await self._repo.create_message(
            id=generate_id("message"), provider="twilio", provider_sid=None, channel=channel,
            direction="outbound", status="queued", to_number=number, from_number=None,
            messaging_service_sid=self._settings.twilio_messaging_service_sid or None, content_sid=content_sid,
            # A template label supports operational debugging without retaining
            # customer-facing message content (even when a template is short).
            body_preview=f"Template: {template_key}", body_hash=body_hash, user_id=user_id,
            organization_id=organization_id, app_id=app_id, client_reference=client_reference,
            idempotency_scope=idempotency_scope,
            idempotency_key=idempotency_key,
            provider_error_code=None,
            sent_at=None,
            delivered_at=None,
            read_at=None, failed_at=None, created_at=now, updated_at=now,
        )
        try:
            status_callback = None
            if self._settings.twilio_webhook_base_url:
                status_callback = (
                    self._settings.twilio_webhook_base_url.rstrip("/")
                    + "/webhooks/twilio/messages/status"
                )
            result = await self._messaging_provider.create_message(
                to_number=number,
                body=body,
                channel=channel,
                content_sid=content_sid,
                status_callback=status_callback,
            )
        except AppHTTPException:
            # Do not retry uncertain sends; the idempotency record keeps a duplicate
            # caller from issuing a second provider request after a timeout.
            row.status = "failed"
            row.failed_at = now
            row.updated_at = now
            await self._db.flush()
            raise
        row.provider = result.provider
        row.provider_sid = result.provider_sid
        row.status = result.status
        row.from_number = result.from_number
        row.sent_at = now if result.status in {"sent", "queued", "accepted"} else None
        row.updated_at = now
        await self._db.flush()
        return row

    async def retrieve_message(self, message_id: str) -> CommunicationMessage:
        row = await self._repo.get_message(message_id)
        if row is None:
            raise _error("communications/not-found", "The message was not found.", status.HTTP_404_NOT_FOUND)
        return row

    async def list_messages(
        self, *, limit: int, starting_after: str | None, ending_before: str | None
    ) -> tuple[list[CommunicationMessage], bool, int]:
        return await self._repo.list_messages(
            limit=limit, starting_after=starting_after, ending_before=ending_before
        )
