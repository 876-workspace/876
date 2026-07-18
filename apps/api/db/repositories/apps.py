from typing import Any

from sqlalchemy import delete, select, update

from core.deletion import deletion_values, should_soft_delete
from db.models import App
from db.repositories.base import BaseRepository


class AppRepository(BaseRepository):
    async def get_by_id(self, app_id: str) -> App | None:
        return await self.db.get(App, app_id)

    async def get_by_client_id(self, client_id: str) -> App | None:
        stmt = select(App).where(App.client_id == client_id, App.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def get_by_slug(self, slug: str) -> App | None:
        stmt = select(App).where(App.slug == slug, App.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def create(self, **kwargs: Any) -> App:
        app = App(**kwargs)
        self.db.add(app)
        await self.db.flush()
        await self.db.refresh(app)
        return app

    async def update(self, app_id: str, **kwargs: Any) -> App | None:
        stmt = update(App).where(App.id == app_id).values(**kwargs).returning(App)
        result = (await self.db.scalars(stmt)).first()
        return result

    async def delete(self, app_id: str, deleted_by: str | None = None, reason: str | None = None) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(App)
                .where(App.id == app_id, App.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(App).where(App.id == app_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_by_org(
        self,
        organization_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        status: str | None = None,
    ) -> tuple[list[App], bool]:
        col = App.created_at
        filters: list[Any] = [App.organization_id == organization_id, App.deleted_at.is_(None)]
        if status:
            filters.append(App.status == status)

        if starting_after:
            anchor = await self.db.get(App, starting_after)
            if anchor is None:
                return [], False
            stmt = (
                select(App)
                .where(*filters, col < anchor.created_at)
                .order_by(col.desc())
                .limit(limit + 1)
            )
        elif ending_before:
            anchor = await self.db.get(App, ending_before)
            if anchor is None:
                return [], False
            stmt = (
                select(App)
                .where(*filters, col > anchor.created_at)
                .order_by(col.asc())
                .limit(limit + 1)
            )
        else:
            stmt = select(App).where(*filters).order_by(col.desc()).limit(limit + 1)

        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        items = rows[:limit]
        if ending_before:
            items = list(reversed(items))
        return items, has_more

    async def list_all(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        app_kind: str | None = None,
        client_type: str | None = None,
        status: str | None = None,
    ) -> tuple[list[App], bool]:
        col = App.created_at
        filters: list[Any] = []
        filters.append(App.deleted_at.is_(None))
        if app_kind:
            filters.append(App.app_kind == app_kind)
        if client_type:
            filters.append(App.client_type == client_type)
        if status:
            filters.append(App.status == status)
        kind_filter = tuple(filters)

        if starting_after:
            anchor = await self.db.get(App, starting_after)
            if anchor is None:
                return [], False
            stmt = select(App).where(*kind_filter, col < anchor.created_at).order_by(col.desc()).limit(limit + 1)
        elif ending_before:
            anchor = await self.db.get(App, ending_before)
            if anchor is None:
                return [], False
            stmt = select(App).where(*kind_filter, col > anchor.created_at).order_by(col.asc()).limit(limit + 1)
        else:
            stmt = select(App).where(*kind_filter).order_by(col.desc()).limit(limit + 1)

        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        items = rows[:limit]
        if ending_before:
            items = list(reversed(items))
        return items, has_more
