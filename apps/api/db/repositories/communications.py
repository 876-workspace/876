from __future__ import annotations

from typing import Any

from sqlalchemy import func, select

from db.models import CommunicationCall, CommunicationMessage, CommunicationPhoneLookup, CommunicationWebhookEvent
from db.repositories.base import BaseRepository


class CommunicationRepository(BaseRepository):
    async def get_lookup(self, number: str) -> CommunicationPhoneLookup | None:
        return await self.db.get(CommunicationPhoneLookup, number)

    async def save_lookup(self, **values: Any) -> CommunicationPhoneLookup:
        # merge() returns the session-attached instance; the one passed in stays
        # detached, so returning it hands back an object the identity map does not
        # know about and that later reads can silently diverge from.
        merged = await self.db.merge(CommunicationPhoneLookup(**values))
        await self.db.flush()
        return merged

    async def get_message(self, message_id: str) -> CommunicationMessage | None:
        return await self.db.get(CommunicationMessage, message_id)

    async def get_message_by_idempotency(self, *, scope: str, key: str) -> CommunicationMessage | None:
        statement = select(CommunicationMessage).where(
            CommunicationMessage.idempotency_scope == scope, CommunicationMessage.idempotency_key == key
        )
        return (await self.db.scalars(statement)).first()

    async def create_message(self, **values: Any) -> CommunicationMessage:
        row = CommunicationMessage(**values)
        self.db.add(row)
        await self.db.flush()
        return row

    async def list_messages(
        self, *, limit: int, starting_after: str | None, ending_before: str | None, status: str | None = None
    ) -> tuple[list[CommunicationMessage], bool, int]:
        filters = [CommunicationMessage.status == status] if status else []
        rows, has_more = await self.cursor_paginate_filtered(
            CommunicationMessage, filters, "created_at", limit, starting_after, ending_before
        )
        total_statement = select(func.count()).select_from(CommunicationMessage)
        if status:
            total_statement = total_statement.where(CommunicationMessage.status == status)
        total = await self.db.scalar(total_statement)
        return rows, has_more, int(total or 0)

    async def get_call(self, call_id: str) -> CommunicationCall | None:
        return await self.db.get(CommunicationCall, call_id)

    async def get_call_by_idempotency(self, *, scope: str, key: str) -> CommunicationCall | None:
        statement = select(CommunicationCall).where(
            CommunicationCall.idempotency_scope == scope, CommunicationCall.idempotency_key == key
        )
        return (await self.db.scalars(statement)).first()

    async def create_call(self, **values: Any) -> CommunicationCall:
        row = CommunicationCall(**values)
        self.db.add(row)
        await self.db.flush()
        return row

    async def list_calls(
        self, *, limit: int, starting_after: str | None, ending_before: str | None, status: str | None = None
    ) -> tuple[list[CommunicationCall], bool, int]:
        filters = [CommunicationCall.status == status] if status else []
        rows, has_more = await self.cursor_paginate_filtered(
            CommunicationCall, filters, "created_at", limit, starting_after, ending_before
        )
        total_statement = select(func.count()).select_from(CommunicationCall)
        if status:
            total_statement = total_statement.where(CommunicationCall.status == status)
        total = await self.db.scalar(total_statement)
        return rows, has_more, int(total or 0)

    async def get_webhook_event(
        self, *, provider_sid: str, event_type: str, payload_hash: str
    ) -> CommunicationWebhookEvent | None:
        statement = select(CommunicationWebhookEvent).where(
            CommunicationWebhookEvent.provider_sid == provider_sid,
            CommunicationWebhookEvent.event_type == event_type,
            CommunicationWebhookEvent.payload_hash == payload_hash,
        )
        return (await self.db.scalars(statement)).first()

    async def create_webhook_event(self, **values: Any) -> CommunicationWebhookEvent:
        row = CommunicationWebhookEvent(**values)
        self.db.add(row)
        await self.db.flush()
        return row

    async def get_message_by_provider_sid(self, provider_sid: str) -> CommunicationMessage | None:
        statement = select(CommunicationMessage).where(CommunicationMessage.provider_sid == provider_sid)
        return (await self.db.scalars(statement)).first()

    async def get_call_by_provider_sid(self, provider_sid: str) -> CommunicationCall | None:
        statement = select(CommunicationCall).where(CommunicationCall.provider_sid == provider_sid)
        return (await self.db.scalars(statement)).first()
