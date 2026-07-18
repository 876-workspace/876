import builtins
from typing import Any

from sqlalchemy import Select, and_, func, or_, select

from db.models import AuditEvent
from db.repositories.base import BaseRepository


class AuditEventRepository(BaseRepository):
    async def create(
        self,
        *,
        id: str,
        event: str,
        source: str,
        app_name: str,
        app_id: str | None,
        user_id: str | None,
        path: str | None,
        search: str | None,
        referrer: str | None,
        title: str | None,
        request_id: str | None,
        session_id: str | None,
        distinct_id: str | None,
        properties: dict[str, Any],
        created_at: int,
    ) -> AuditEvent:
        row = AuditEvent(
            id=id,
            event=event,
            source=source,
            app_name=app_name,
            app_id=app_id,
            user_id=user_id,
            path=path,
            search=search,
            referrer=referrer,
            title=title,
            request_id=request_id,
            session_id=session_id,
            distinct_id=distinct_id,
            properties=properties,
            created_at=created_at,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def list(
        self,
        *,
        limit: int,
        starting_after: str | None = None,
        ending_before: str | None = None,
        app_name: str | None = None,
        event: str | None = None,
        user_id: str | None = None,
        path: str | None = None,
        query: str | None = None,
    ) -> tuple[builtins.list[AuditEvent], bool, int]:
        filters = self._filters(
            app_name=app_name,
            event=event,
            user_id=user_id,
            path=path,
            query=query,
        )
        total_count = await self._count(filters)

        if starting_after is not None:
            anchor = await self.db.get(AuditEvent, starting_after)
            if anchor is None:
                return [], False, total_count

            filters.append(
                or_(
                    AuditEvent.created_at < anchor.created_at,
                    and_(
                        AuditEvent.created_at == anchor.created_at,
                        AuditEvent.id < anchor.id,
                    ),
                )
            )

            rows = await self._fetch(filters, limit, descending=True)
            return rows[:limit], len(rows) > limit, total_count

        if ending_before is not None:
            anchor = await self.db.get(AuditEvent, ending_before)
            if anchor is None:
                return [], False, total_count

            filters.append(
                or_(
                    AuditEvent.created_at > anchor.created_at,
                    and_(
                        AuditEvent.created_at == anchor.created_at,
                        AuditEvent.id > anchor.id,
                    ),
                )
            )

            rows = await self._fetch(filters, limit, descending=False)
            return list(reversed(rows[:limit])), len(rows) > limit, total_count

        rows = await self._fetch(filters, limit, descending=True)
        return rows[:limit], len(rows) > limit, total_count

    def _filters(
        self,
        *,
        app_name: str | None,
        event: str | None,
        user_id: str | None,
        path: str | None,
        query: str | None,
    ) -> builtins.list[Any]:
        filters: builtins.list[Any] = []
        if app_name:
            filters.append(AuditEvent.app_name == app_name)
        if event:
            filters.append(AuditEvent.event == event)
        if user_id:
            filters.append(AuditEvent.user_id == user_id)
        if path:
            filters.append(AuditEvent.path.ilike(f"%{path}%"))
        if query:
            term = f"%{query}%"
            filters.append(
                or_(
                    AuditEvent.event.ilike(term),
                    AuditEvent.app_name.ilike(term),
                    AuditEvent.path.ilike(term),
                    AuditEvent.request_id.ilike(term),
                    AuditEvent.user_id.ilike(term),
                )
            )
        return filters

    async def _count(self, filters: builtins.list[Any]) -> int:
        stmt = select(func.count()).select_from(AuditEvent)
        for condition in filters:
            stmt = stmt.where(condition)
        return int((await self.db.execute(stmt)).scalar_one())

    async def _fetch(
        self,
        filters: builtins.list[Any],
        limit: int,
        *,
        descending: bool,
    ) -> builtins.list[AuditEvent]:
        stmt: Select[tuple[AuditEvent]] = select(AuditEvent)
        for condition in filters:
            stmt = stmt.where(condition)

        if descending:
            stmt = stmt.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        else:
            stmt = stmt.order_by(AuditEvent.created_at.asc(), AuditEvent.id.asc())

        return list((await self.db.scalars(stmt.limit(limit + 1))).all())
