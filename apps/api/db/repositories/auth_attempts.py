from __future__ import annotations

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import InstrumentedAttribute

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
        device_id: str | None = None,
        app_id: str | None = None,
        created_after: int | None = None,
        created_before: int | None = None,
        query: str | None = None,
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
        if device_id is not None:
            filters.append(AuthAttempt.device_id == device_id)
        if app_id is not None:
            filters.append(AuthAttempt.app_id == app_id)
        if created_after is not None:
            filters.append(AuthAttempt.created_at >= created_after)
        if created_before is not None:
            filters.append(AuthAttempt.created_at <= created_before)
        if query:
            needle = f"%{query.strip()}%"
            filters.append(
                or_(
                    AuthAttempt.identifier.ilike(needle),
                    AuthAttempt.ip_address.ilike(needle),
                    AuthAttempt.device_fingerprint.ilike(needle),
                )
            )

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

    async def summary(self, *, since: int) -> dict[str, object]:
        window = AuthAttempt.created_at >= since
        outcome_rows = (
            await self.db.execute(select(AuthAttempt.outcome, func.count()).where(window).group_by(AuthAttempt.outcome))
        ).all()

        async def aggregate(
            column: InstrumentedAttribute[object], failures_only: bool = False
        ) -> list[dict[str, object]]:
            stmt = select(column, func.count()).where(window)
            if failures_only:
                stmt = stmt.where(AuthAttempt.outcome == "failed")
            rows = (await self.db.execute(stmt.group_by(column).order_by(func.count().desc()).limit(10))).all()
            return [{"value": value, "count": count} for value, count in rows if value is not None]

        total = int((await self.db.scalar(select(func.count()).select_from(AuthAttempt).where(window))) or 0)
        return {
            "total": total,
            "outcomes": {value: count for value, count in outcome_rows},
            "top_countries": await aggregate(AuthAttempt.ip_country_code),
            "top_failure_codes": await aggregate(AuthAttempt.failure_code, True),
            "top_failure_ips": await aggregate(AuthAttempt.ip_address, True),
        }
