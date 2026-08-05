from __future__ import annotations

from sqlalchemy import ColumnElement, func, select

from core.id import generate_id
from db.models import AuthAttempt
from db.repositories.base import BaseRepository


class AuthAttemptRepository(BaseRepository):
    async def create(self, **values: object) -> AuthAttempt:
        row = AuthAttempt(id=generate_id("authAttempt"), **values)
        self.db.add(row)
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def retrieve(self, attempt_id: str) -> AuthAttempt | None:
        return await self.db.get(AuthAttempt, attempt_id)

    async def list(
        self,
        *,
        limit: int = 25,
        starting_after: str | None = None,
        ending_before: str | None = None,
        user_id: str | None = None,
        identifier: str | None = None,
        event: str | None = None,
        outcome: str | None = None,
        ip_address: str | None = None,
        ip_country_code: str | None = None,
        device_fingerprint: str | None = None,
        app_id: str | None = None,
        created_after: int | None = None,
        created_before: int | None = None,
    ) -> tuple[list[AuthAttempt], bool]:
        """Newest-first attempt history. Every filter is an AND narrowing."""
        filters: list[ColumnElement[bool]] = []
        if user_id is not None:
            filters.append(AuthAttempt.user_id == user_id)
        if identifier is not None:
            filters.append(AuthAttempt.identifier == identifier.lower())
        if event is not None:
            filters.append(AuthAttempt.event == event)
        if outcome is not None:
            filters.append(AuthAttempt.outcome == outcome)
        if ip_address is not None:
            filters.append(AuthAttempt.ip_address == ip_address)
        if ip_country_code is not None:
            filters.append(AuthAttempt.ip_country_code == ip_country_code.upper())
        if device_fingerprint is not None:
            filters.append(AuthAttempt.device_fingerprint == device_fingerprint)
        if app_id is not None:
            filters.append(AuthAttempt.app_id == app_id)
        if created_after is not None:
            filters.append(AuthAttempt.created_at >= created_after)
        if created_before is not None:
            filters.append(AuthAttempt.created_at <= created_before)

        return await self.cursor_paginate_filtered(
            AuthAttempt,
            filters,
            "created_at",
            limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    async def count_recent_failures(
        self, *, identifier: str | None = None, ip_address: str | None = None, since: int
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(AuthAttempt)
            .where(AuthAttempt.outcome == "failed", AuthAttempt.created_at >= since)
        )
        if identifier is not None:
            stmt = stmt.where(AuthAttempt.identifier == identifier.lower())
        if ip_address is not None:
            stmt = stmt.where(AuthAttempt.ip_address == ip_address)
        return int((await self.db.scalar(stmt)) or 0)
