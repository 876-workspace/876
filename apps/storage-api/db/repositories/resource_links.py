from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ResourceLink


class ResourceLinkRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        *,
        id: str,
        file_id: str,
        app_id: str,
        resource_type: str,
        resource_id: str,
        relation: str,
        created_by: str,
        created_at: int,
    ) -> ResourceLink:
        existing = await self.find_exact(
            file_id=file_id,
            app_id=app_id,
            resource_type=resource_type,
            resource_id=resource_id,
            relation=relation,
        )
        if existing is not None:
            return existing

        row = ResourceLink(
            id=id,
            file_id=file_id,
            app_id=app_id,
            resource_type=resource_type,
            resource_id=resource_id,
            relation=relation,
            created_by=created_by,
            created_at=created_at,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def find_exact(
        self,
        *,
        file_id: str,
        app_id: str,
        resource_type: str,
        resource_id: str,
        relation: str,
    ) -> ResourceLink | None:
        statement = select(ResourceLink).where(
            ResourceLink.file_id == file_id,
            ResourceLink.app_id == app_id,
            ResourceLink.resource_type == resource_type,
            ResourceLink.resource_id == resource_id,
            ResourceLink.relation == relation,
        )
        return (await self.db.scalars(statement)).first()

    async def list_for_resource(
        self,
        *,
        app_id: str,
        resource_type: str,
        resource_id: str,
        relation: str | None = None,
    ) -> list[ResourceLink]:
        statement = select(ResourceLink).where(
            ResourceLink.app_id == app_id,
            ResourceLink.resource_type == resource_type,
            ResourceLink.resource_id == resource_id,
        )
        if relation is not None:
            statement = statement.where(ResourceLink.relation == relation)
        statement = statement.order_by(ResourceLink.created_at.asc(), ResourceLink.id.asc())
        return list((await self.db.scalars(statement)).all())

    async def delete(self, link_id: str) -> bool:
        row = await self.db.get(ResourceLink, link_id)
        if row is None:
            return False
        await self.db.delete(row)
        await self.db.flush()
        return True
