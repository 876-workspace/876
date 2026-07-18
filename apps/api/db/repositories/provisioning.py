from collections.abc import Sequence
from decimal import Decimal
from typing import Literal, Protocol

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.id import generate_id
from db.models import (
    ProvisioningManifest,
    ProvisioningManifestRevision,
    ProvisioningNote,
    ProvisioningProperty,
    ProvisioningResource,
    ProvisioningStep,
)

ProvisioningTargetType = Literal["organization", "finance", "application"]


class ProvisioningPropertyData(Protocol):
    @property
    def key(self) -> str: ...

    @property
    def value_type(self) -> str: ...

    @property
    def string_value(self) -> str | None: ...

    @property
    def integer_value(self) -> int | None: ...

    @property
    def decimal_value(self) -> Decimal | None: ...

    @property
    def boolean_value(self) -> bool | None: ...

    @property
    def reference_namespace(self) -> str | None: ...

    @property
    def reference_key(self) -> str | None: ...


class ProvisioningResourceData(Protocol):
    @property
    def resource_type(self) -> str: ...

    @property
    def key(self) -> str: ...

    @property
    def position(self) -> int: ...

    @property
    def properties(self) -> Sequence[ProvisioningPropertyData]: ...


class ProvisioningStepData(Protocol):
    @property
    def key(self) -> str: ...

    @property
    def description(self) -> str: ...

    @property
    def position(self) -> int: ...


class ProvisioningRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _revision_load_options() -> tuple[ExecutableOption, ...]:
        return (
            selectinload(ProvisioningManifestRevision.resources).selectinload(ProvisioningResource.properties),
            selectinload(ProvisioningManifestRevision.steps),
        )

    async def retrieve_manifest(
        self,
        target_type: ProvisioningTargetType,
        target_key: str,
    ) -> ProvisioningManifest | None:
        manifest: ProvisioningManifest | None = await self.db.scalar(
            select(ProvisioningManifest).where(
                ProvisioningManifest.target_type == target_type,
                ProvisioningManifest.target_key == target_key,
            )
        )
        return manifest

    async def retrieve_revision(
        self,
        target_type: ProvisioningTargetType,
        target_key: str,
        status: str,
    ) -> ProvisioningManifestRevision | None:
        statement = (
            select(ProvisioningManifestRevision)
            .join(ProvisioningManifest)
            .where(
                ProvisioningManifest.target_type == target_type,
                ProvisioningManifest.target_key == target_key,
                ProvisioningManifestRevision.status == status,
            )
            .options(*self._revision_load_options())
        )
        revision: ProvisioningManifestRevision | None = await self.db.scalar(statement)
        return revision

    async def get_or_create_manifest(
        self,
        target_type: ProvisioningTargetType,
        target_key: str,
        *,
        now: int,
    ) -> ProvisioningManifest:
        existing = await self.retrieve_manifest(target_type, target_key)
        if existing is not None:
            return existing
        await self.db.execute(
            insert(ProvisioningManifest)
            .values(
                id=generate_id("provisioningManifest"),
                target_type=target_type,
                target_key=target_key,
                manifest_version=1,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["target_type", "target_key"])
        )
        manifest = await self.retrieve_manifest(target_type, target_key)
        assert manifest is not None
        return manifest

    async def replace_draft(
        self,
        target_type: ProvisioningTargetType,
        target_key: str,
        *,
        reconciliation: Literal["create_missing"],
        preserve_tenant_overrides: bool,
        finance_dependency: Literal["none", "embedded"],
        finance_scopes: Sequence[str],
        resources: Sequence[ProvisioningResourceData],
        steps: Sequence[ProvisioningStepData],
        now: int,
    ) -> ProvisioningManifestRevision:
        manifest = await self.get_or_create_manifest(target_type, target_key, now=now)
        locked_manifest = await self.db.scalar(
            select(ProvisioningManifest).where(ProvisioningManifest.id == manifest.id).with_for_update()
        )
        assert locked_manifest is not None

        draft = await self.db.scalar(
            select(ProvisioningManifestRevision).where(
                ProvisioningManifestRevision.manifest_id == manifest.id,
                ProvisioningManifestRevision.status == "draft",
            )
        )
        if draft is None:
            latest_revision = await self.db.scalar(
                select(func.max(ProvisioningManifestRevision.revision)).where(
                    ProvisioningManifestRevision.manifest_id == manifest.id
                )
            )
            draft = ProvisioningManifestRevision(
                id=generate_id("provisioningRevision"),
                manifest_id=manifest.id,
                revision=(latest_revision or 0) + 1,
                status="draft",
                reconciliation=reconciliation,
                preserve_tenant_overrides=preserve_tenant_overrides,
                finance_dependency=finance_dependency,
                finance_scopes=list(finance_scopes),
                published_at=None,
                created_at=now,
                updated_at=now,
            )
            self.db.add(draft)
            await self.db.flush()
        else:
            await self.db.execute(delete(ProvisioningResource).where(ProvisioningResource.revision_id == draft.id))
            await self.db.execute(delete(ProvisioningStep).where(ProvisioningStep.revision_id == draft.id))
            draft.reconciliation = reconciliation
            draft.preserve_tenant_overrides = preserve_tenant_overrides
            draft.finance_dependency = finance_dependency
            draft.finance_scopes = list(finance_scopes)
            draft.updated_at = now

        for resource_data in resources:
            resource = ProvisioningResource(
                id=generate_id("provisioningResource"),
                revision_id=draft.id,
                resource_type=resource_data.resource_type,
                key=resource_data.key,
                position=resource_data.position,
                created_at=now,
                updated_at=now,
            )
            self.db.add(resource)
            for property_data in resource_data.properties:
                self.db.add(
                    ProvisioningProperty(
                        id=generate_id("provisioningProperty"),
                        resource=resource,
                        key=property_data.key,
                        value_type=property_data.value_type,
                        string_value=property_data.string_value,
                        integer_value=property_data.integer_value,
                        decimal_value=property_data.decimal_value,
                        boolean_value=property_data.boolean_value,
                        reference_namespace=property_data.reference_namespace,
                        reference_key=property_data.reference_key,
                        created_at=now,
                        updated_at=now,
                    )
                )

        for step_data in steps:
            self.db.add(
                ProvisioningStep(
                    id=generate_id("provisioningStep"),
                    revision_id=draft.id,
                    key=step_data.key,
                    description=step_data.description,
                    position=step_data.position,
                    created_at=now,
                    updated_at=now,
                )
            )

        locked_manifest.updated_at = now
        await self.db.flush()
        draft_id = draft.id
        self.db.expire(draft)
        refreshed = await self.db.scalar(
            select(ProvisioningManifestRevision)
            .where(ProvisioningManifestRevision.id == draft_id)
            .options(*self._revision_load_options())
        )
        assert refreshed is not None
        return refreshed

    async def retrieve_draft_for_update(
        self,
        target_type: ProvisioningTargetType,
        target_key: str,
    ) -> tuple[ProvisioningManifest, ProvisioningManifestRevision] | None:
        manifest = await self.db.scalar(
            select(ProvisioningManifest)
            .where(
                ProvisioningManifest.target_type == target_type,
                ProvisioningManifest.target_key == target_key,
            )
            .with_for_update()
        )
        if manifest is None:
            return None
        draft = await self.db.scalar(
            select(ProvisioningManifestRevision)
            .where(
                ProvisioningManifestRevision.manifest_id == manifest.id,
                ProvisioningManifestRevision.status == "draft",
            )
            .options(*self._revision_load_options())
        )
        if draft is None:
            return None
        return manifest, draft

    async def promote_draft(
        self,
        manifest: ProvisioningManifest,
        draft: ProvisioningManifestRevision,
        *,
        now: int,
    ) -> ProvisioningManifestRevision:
        current = await self.db.scalar(
            select(ProvisioningManifestRevision).where(
                ProvisioningManifestRevision.manifest_id == manifest.id,
                ProvisioningManifestRevision.status == "published",
            )
        )
        if current is not None:
            current.status = "archived"
            current.updated_at = now
            # Release the partial unique index before promoting the draft.
            await self.db.flush()
        draft.status = "published"
        draft.published_at = now
        draft.updated_at = now
        manifest.updated_at = now
        await self.db.flush()
        draft_id = draft.id
        self.db.expire(draft)
        published = await self.db.scalar(
            select(ProvisioningManifestRevision)
            .where(ProvisioningManifestRevision.id == draft_id)
            .options(*self._revision_load_options())
        )
        assert published is not None
        return published

    async def publish(
        self, target_type: ProvisioningTargetType, target_key: str, *, now: int
    ) -> ProvisioningManifestRevision | None:
        locked = await self.retrieve_draft_for_update(target_type, target_key)
        if locked is None:
            return None
        manifest, draft = locked
        return await self.promote_draft(manifest, draft, now=now)

    async def list_notes(
        self,
        manifest_id: str,
        *,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> tuple[list[ProvisioningNote], bool]:
        filters = [ProvisioningNote.manifest_id == manifest_id]
        order = ProvisioningNote.created_at
        cursor_id = starting_after or ending_before
        if cursor_id:
            anchor = await self.db.get(ProvisioningNote, cursor_id)
            if anchor is None or anchor.manifest_id != manifest_id:
                return [], False
            filters.append(
                or_(order < anchor.created_at, and_(order == anchor.created_at, ProvisioningNote.id < anchor.id))
                if starting_after
                else or_(order > anchor.created_at, and_(order == anchor.created_at, ProvisioningNote.id > anchor.id))
            )
        statement = (
            select(ProvisioningNote)
            .where(*filters)
            .order_by(
                order.desc() if not ending_before else order.asc(),
                ProvisioningNote.id.desc() if not ending_before else ProvisioningNote.id.asc(),
            )
            .limit(limit + 1)
        )
        rows = list((await self.db.scalars(statement)).all())
        has_more = len(rows) > limit
        items = rows[:limit]
        if ending_before:
            items.reverse()
        return items, has_more

    async def create_note(
        self,
        *,
        note_id: str,
        manifest_id: str,
        body: str,
        author_user_id: str | None,
        now: int,
    ) -> ProvisioningNote:
        note = ProvisioningNote(
            id=note_id,
            manifest_id=manifest_id,
            body=body,
            author_user_id=author_user_id,
            created_at=now,
            updated_at=now,
        )
        self.db.add(note)
        await self.db.flush()
        await self.db.refresh(note)
        return note

    async def delete_note(self, manifest_id: str, note_id: str) -> bool:
        result = await self.db.execute(
            delete(ProvisioningNote).where(
                ProvisioningNote.id == note_id,
                ProvisioningNote.manifest_id == manifest_id,
            )
        )
        return bool(getattr(result, "rowcount", 0))
