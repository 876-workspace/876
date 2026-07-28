from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.id import generate_id
from db.models import StorageQuota, StorageUsage
from db.repositories.usage import QuotaSubject, UsageRepository


class QuotaRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(
        self,
        subject_type: str,
        subject_id: str,
        *,
        for_update: bool = False,
    ) -> StorageQuota | None:
        statement = select(StorageQuota).where(
            StorageQuota.subject_type == subject_type,
            StorageQuota.subject_id == subject_id,
        )
        if for_update:
            statement = statement.with_for_update()

        return (await self.db.scalars(statement)).first()

    async def get_many(
        self,
        subjects: Iterable[QuotaSubject],
    ) -> list[StorageQuota]:
        ordered_subjects = sorted(set(subjects))
        if not ordered_subjects:
            return []

        return list(
            (
                await self.db.scalars(
                    select(StorageQuota)
                    .where(
                        or_(
                            *[
                                and_(
                                    StorageQuota.subject_type == subject_type,
                                    StorageQuota.subject_id == subject_id,
                                )
                                for subject_type, subject_id in ordered_subjects
                            ]
                        )
                    )
                    .order_by(
                        StorageQuota.subject_type,
                        StorageQuota.subject_id,
                    )
                )
            ).all()
        )

    async def ensure_default(
        self,
        *,
        subject_type: str,
        subject_id: str,
        limit_bytes: int,
        now: int,
        parent_org_id: str | None = None,
    ) -> StorageQuota:
        if limit_bytes < 0:
            raise ValueError("Default quota bytes cannot be negative.")

        values = {
            "id": generate_id("storage_quota"),
            "subject_type": subject_type,
            "subject_id": subject_id,
            "parent_org_id": parent_org_id,
            "limit_bytes": limit_bytes,
            "max_file_bytes": None,
            "default_user_limit_bytes": None,
            "source": "default",
            "plan_product_id": None,
            "plan_slug": None,
            "plan_name": None,
            "status": "active",
            "entitlement_version": 0,
            "created_at": now,
            "updated_at": now,
        }
        dialect = self.db.get_bind().dialect.name
        if dialect == "postgresql":
            await self.db.execute(
                postgresql_insert(StorageQuota)
                .values(**values)
                .on_conflict_do_nothing(
                    index_elements=["subject_type", "subject_id"],
                )
            )
        elif dialect == "sqlite":
            await self.db.execute(
                sqlite_insert(StorageQuota)
                .values(**values)
                .on_conflict_do_nothing(
                    index_elements=["subject_type", "subject_id"],
                )
            )
        else:
            raise RuntimeError(
                f"Unsupported database dialect for quota creation: {dialect}"
            )

        row = await self.get(subject_type, subject_id, for_update=True)
        if row is None:
            raise RuntimeError("Default quota insert did not create a row.")

        await UsageRepository(self.db).lock_for_update(
            [(subject_type, subject_id)],
            updated_at=now,
        )

        return row

    async def upsert_from_entitlement(
        self,
        *,
        subject_type: str,
        subject_id: str,
        parent_org_id: str | None,
        limit_bytes: int | None,
        max_file_bytes: int | None,
        default_user_limit_bytes: int | None,
        plan_product_id: str | None,
        plan_slug: str | None,
        plan_name: str | None,
        status: str,
        entitlement_version: int,
        now: int,
        source: str = "plan",
    ) -> StorageQuota:
        values = {
            "id": generate_id("storage_quota"),
            "subject_type": subject_type,
            "subject_id": subject_id,
            "parent_org_id": parent_org_id,
            "limit_bytes": limit_bytes,
            "max_file_bytes": max_file_bytes,
            "default_user_limit_bytes": default_user_limit_bytes,
            "source": source,
            "plan_product_id": plan_product_id,
            "plan_slug": plan_slug,
            "plan_name": plan_name,
            "status": status,
            "entitlement_version": entitlement_version,
            "created_at": now,
            "updated_at": now,
        }
        dialect = self.db.get_bind().dialect.name
        if dialect == "postgresql":
            await self.db.execute(
                postgresql_insert(StorageQuota)
                .values(**values)
                .on_conflict_do_nothing(
                    index_elements=["subject_type", "subject_id"],
                )
            )
        elif dialect == "sqlite":
            await self.db.execute(
                sqlite_insert(StorageQuota)
                .values(**values)
                .on_conflict_do_nothing(
                    index_elements=["subject_type", "subject_id"],
                )
            )
        else:
            raise RuntimeError(
                f"Unsupported database dialect for quota upsert: {dialect}"
            )

        row = await self.get(subject_type, subject_id, for_update=True)
        if row is None:
            raise RuntimeError("Entitlement upsert did not create a quota row.")

        if entitlement_version >= row.entitlement_version:
            row.parent_org_id = parent_org_id
            row.limit_bytes = limit_bytes
            row.max_file_bytes = max_file_bytes
            row.default_user_limit_bytes = default_user_limit_bytes
            row.source = source
            row.plan_product_id = plan_product_id
            row.plan_slug = plan_slug
            row.plan_name = plan_name
            row.status = status
            row.entitlement_version = entitlement_version
            row.updated_at = now
            await self.db.flush()

        await UsageRepository(self.db).lock_for_update(
            [(subject_type, subject_id)],
            updated_at=now,
        )

        return row

    async def list(
        self,
        *,
        subject_type: str | None = None,
        status: str | None = None,
        usage_band: str | None = None,
        near_limit_percent: int = 80,
        limit: int = 100,
        starting_after: str | None = None,
        ending_before: str | None = None,
    ) -> list[StorageQuota]:
        statement = select(StorageQuota)
        if usage_band is not None:
            statement = statement.outerjoin(
                StorageUsage,
                and_(
                    StorageUsage.subject_type == StorageQuota.subject_type,
                    StorageUsage.subject_id == StorageQuota.subject_id,
                ),
            )
            total_bytes = func.coalesce(StorageUsage.bytes_used, 0) + func.coalesce(
                StorageUsage.bytes_reserved,
                0,
            )
            if usage_band == "ok":
                statement = statement.where(
                    or_(
                        StorageQuota.limit_bytes.is_(None),
                        total_bytes * 100
                        < StorageQuota.limit_bytes * near_limit_percent,
                    )
                )
            elif usage_band == "near_limit":
                statement = statement.where(
                    StorageQuota.limit_bytes.is_not(None),
                    total_bytes * 100
                    >= StorageQuota.limit_bytes * near_limit_percent,
                    total_bytes < StorageQuota.limit_bytes,
                )
            elif usage_band == "over_limit":
                statement = statement.where(
                    StorageQuota.limit_bytes.is_not(None),
                    total_bytes >= StorageQuota.limit_bytes,
                )
            else:
                raise ValueError(
                    f"Unsupported quota usage band: {usage_band}"
                )

        if subject_type is not None:
            statement = statement.where(
                StorageQuota.subject_type == subject_type
            )
        if status is not None:
            statement = statement.where(StorageQuota.status == status)

        cursor_id = starting_after or ending_before
        if cursor_id is not None:
            anchor = await self.db.get(StorageQuota, cursor_id)
            if anchor is not None:
                statement = statement.where(
                    StorageQuota.id > anchor.id
                    if starting_after is not None
                    else StorageQuota.id < anchor.id
                )

        reverse = ending_before is not None
        statement = statement.order_by(
            StorageQuota.id.desc() if reverse else StorageQuota.id.asc()
        ).limit(limit)
        rows = list((await self.db.scalars(statement)).all())
        if reverse:
            rows.reverse()

        return rows
