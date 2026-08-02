from __future__ import annotations

from typing import Any

from sqlalchemy import func, select

from db.models import CommunicationMessage, CommunicationPhoneLookup, CommunicationWebhookEvent
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
        self, *, limit: int, starting_after: str | None, ending_before: str | None
    ) -> tuple[list[CommunicationMessage], bool, int]:
        rows, has_more = await self.cursor_paginate(
            CommunicationMessage, "created_at", limit, starting_after, ending_before
        )
        total = await self.db.scalar(select(func.count()).select_from(CommunicationMessage))
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
