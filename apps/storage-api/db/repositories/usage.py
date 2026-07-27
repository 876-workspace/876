from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from sqlalchemy import (
    ColumnElement,
    and_,
    case,
    func,
    or_,
    select,
    tuple_,
    update,
)
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import File, StorageQuota, StorageUsage, UploadSession

QuotaSubject = tuple[str, str]


@dataclass(frozen=True)
class UsageRecomputeResult:
    subject_type: str
    subject_id: str
    before_bytes_used: int
    before_bytes_reserved: int
    before_files_count: int
    bytes_used: int
    bytes_reserved: int
    files_count: int

    @property
    def delta_bytes(self) -> int:
        return (self.bytes_used + self.bytes_reserved) - (
            self.before_bytes_used + self.before_bytes_reserved
        )


@dataclass(frozen=True)
class UsageSummaryRow:
    subject_type: str
    subject_id: str
    parent_org_id: str | None
    limit_bytes: int | None
    max_file_bytes: int | None
    bytes_used: int
    bytes_reserved: int
    files_count: int
    quota_status: str | None
    recomputed_at: int | None
    updated_at: int


@dataclass(frozen=True)
class MemberUsageRow:
    user_id: str
    owned_bytes: int
    owned_files: int
    uploaded_bytes: int
    uploaded_files: int
    limit_bytes: int | None


def _file_matches_subject(
    subject_type: str,
    subject_id: str,
) -> ColumnElement[bool]:
    owner_match = and_(
        File.owner_type == subject_type,
        File.owner_id == subject_id,
    )
    if subject_type != "organization":
        return owner_match

    return or_(
        owner_match,
        and_(
            File.quota_org_id == subject_id,
            File.owner_type != "organization",
        ),
    )


class UsageRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def lock_for_update(
        self,
        subjects: Iterable[QuotaSubject],
        *,
        updated_at: int,
    ) -> list[StorageUsage]:
        ordered_subjects = sorted(set(subjects))
        if not ordered_subjects:
            return []

        values = [
            {
                "subject_type": subject_type,
                "subject_id": subject_id,
                "bytes_used": 0,
                "bytes_reserved": 0,
                "files_count": 0,
                "updated_at": updated_at,
            }
            for subject_type, subject_id in ordered_subjects
        ]
        dialect = self.db.get_bind().dialect.name
        if dialect == "postgresql":
            await self.db.execute(
                postgresql_insert(StorageUsage)
                .values(values)
                .on_conflict_do_nothing(
                    index_elements=["subject_type", "subject_id"],
                )
            )
        elif dialect == "sqlite":
            await self.db.execute(
                sqlite_insert(StorageUsage)
                .values(values)
                .on_conflict_do_nothing(
                    index_elements=["subject_type", "subject_id"],
                )
            )
        else:
            raise RuntimeError(
                f"Unsupported database dialect for quota locking: {dialect}"
            )

        rows = list(
            (
                await self.db.scalars(
                    select(StorageUsage)
                    .where(
                        tuple_(
                            StorageUsage.subject_type,
                            StorageUsage.subject_id,
                        ).in_(ordered_subjects)
                    )
                    .order_by(
                        StorageUsage.subject_type,
                        StorageUsage.subject_id,
                    )
                    .with_for_update()
                )
            ).all()
        )
        if len(rows) != len(ordered_subjects):
            raise RuntimeError("Failed to lock every requested usage subject.")

        return rows

    async def reserve(
        self,
        rows: Sequence[StorageUsage],
        *,
        bytes_to_reserve: int,
        updated_at: int,
    ) -> None:
        if bytes_to_reserve < 0:
            raise ValueError("Reserved bytes cannot be negative.")
        if not rows:
            return

        await self.db.execute(
            update(StorageUsage)
            .where(
                tuple_(
                    StorageUsage.subject_type,
                    StorageUsage.subject_id,
                ).in_(_subjects_for_rows(rows))
            )
            .values(
                bytes_reserved=StorageUsage.bytes_reserved + bytes_to_reserve,
                updated_at=updated_at,
            )
        )
        await self._refresh(rows)

    async def commit_reservation(
        self,
        rows: Sequence[StorageUsage],
        *,
        reserved_bytes: int,
        used_bytes: int,
        updated_at: int,
    ) -> list[QuotaSubject]:
        _validate_release_amounts(reserved_bytes, used_bytes)
        if not rows:
            return []

        underflows = [
            (row.subject_type, row.subject_id)
            for row in rows
            if row.bytes_reserved < reserved_bytes
        ]
        await self.db.execute(
            update(StorageUsage)
            .where(
                tuple_(
                    StorageUsage.subject_type,
                    StorageUsage.subject_id,
                ).in_(_subjects_for_rows(rows))
            )
            .values(
                bytes_reserved=case(
                    (StorageUsage.bytes_reserved < reserved_bytes, 0),
                    else_=StorageUsage.bytes_reserved - reserved_bytes,
                ),
                bytes_used=StorageUsage.bytes_used + used_bytes,
                files_count=StorageUsage.files_count + 1,
                updated_at=updated_at,
            )
        )
        await self._refresh(rows)

        return underflows

    async def release_reservation(
        self,
        rows: Sequence[StorageUsage],
        *,
        reserved_bytes: int,
        updated_at: int,
    ) -> list[QuotaSubject]:
        if reserved_bytes < 0:
            raise ValueError("Released reservation bytes cannot be negative.")
        if not rows:
            return []

        underflows = [
            (row.subject_type, row.subject_id)
            for row in rows
            if row.bytes_reserved < reserved_bytes
        ]
        await self.db.execute(
            update(StorageUsage)
            .where(
                tuple_(
                    StorageUsage.subject_type,
                    StorageUsage.subject_id,
                ).in_(_subjects_for_rows(rows))
            )
            .values(
                bytes_reserved=case(
                    (StorageUsage.bytes_reserved < reserved_bytes, 0),
                    else_=StorageUsage.bytes_reserved - reserved_bytes,
                ),
                updated_at=updated_at,
            )
        )
        await self._refresh(rows)

        return underflows

    async def release_usage(
        self,
        rows: Sequence[StorageUsage],
        *,
        used_bytes: int,
        files_count: int = 1,
        updated_at: int,
    ) -> list[QuotaSubject]:
        _validate_release_amounts(used_bytes, files_count)
        if not rows:
            return []

        underflows = [
            (row.subject_type, row.subject_id)
            for row in rows
            if row.bytes_used < used_bytes or row.files_count < files_count
        ]
        await self.db.execute(
            update(StorageUsage)
            .where(
                tuple_(
                    StorageUsage.subject_type,
                    StorageUsage.subject_id,
                ).in_(_subjects_for_rows(rows))
            )
            .values(
                bytes_used=case(
                    (StorageUsage.bytes_used < used_bytes, 0),
                    else_=StorageUsage.bytes_used - used_bytes,
                ),
                files_count=case(
                    (StorageUsage.files_count < files_count, 0),
                    else_=StorageUsage.files_count - files_count,
                ),
                updated_at=updated_at,
            )
        )
        await self._refresh(rows)

        return underflows

    async def recompute(
        self,
        *,
        subject_type: str,
        subject_id: str,
        now: int,
    ) -> UsageRecomputeResult:
        row = (
            await self.lock_for_update(
                [(subject_type, subject_id)],
                updated_at=now,
            )
        )[0]
        before = (
            row.bytes_used,
            row.bytes_reserved,
            row.files_count,
        )
        subject_filter = _file_matches_subject(subject_type, subject_id)
        ready_filter = and_(
            subject_filter,
            File.status == "ready",
            File.deleted_at.is_(None),
        )

        bytes_used, files_count = (
            await self.db.execute(
                select(
                    func.coalesce(func.sum(File.size_bytes), 0),
                    func.count(File.id),
                ).where(ready_filter)
            )
        ).one()
        bytes_reserved = await self.db.scalar(
            select(
                func.coalesce(
                    func.sum(UploadSession.declared_size_bytes),
                    0,
                )
            )
            .select_from(UploadSession)
            .join(File, File.id == UploadSession.file_id)
            .where(subject_filter)
            .where(UploadSession.status == "created")
            .where(UploadSession.reservation_released_at.is_(None))
            .where(UploadSession.expires_at >= now)
        )

        row.bytes_used = int(bytes_used)
        row.bytes_reserved = int(bytes_reserved or 0)
        row.files_count = int(files_count)
        row.recomputed_at = now
        row.updated_at = now
        await self.db.flush()

        return UsageRecomputeResult(
            subject_type=subject_type,
            subject_id=subject_id,
            before_bytes_used=before[0],
            before_bytes_reserved=before[1],
            before_files_count=before[2],
            bytes_used=row.bytes_used,
            bytes_reserved=row.bytes_reserved,
            files_count=row.files_count,
        )

    async def list_summaries(
        self,
        *,
        limit: int = 100,
        sort: str = "used_desc",
        status: str = "all",
        near_limit_percent: int = 80,
    ) -> list[UsageSummaryRow]:
        total_bytes = StorageUsage.bytes_used + StorageUsage.bytes_reserved
        statement = (
            select(StorageUsage, StorageQuota)
            .outerjoin(
                StorageQuota,
                and_(
                    StorageQuota.subject_type == StorageUsage.subject_type,
                    StorageQuota.subject_id == StorageUsage.subject_id,
                ),
            )
            .limit(limit)
        )
        if status == "ok":
            statement = statement.where(
                or_(
                    StorageQuota.limit_bytes.is_(None),
                    total_bytes * 100
                    < StorageQuota.limit_bytes * near_limit_percent,
                )
            )
        elif status == "near_limit":
            statement = statement.where(
                StorageQuota.limit_bytes.is_not(None),
                total_bytes * 100
                >= StorageQuota.limit_bytes * near_limit_percent,
                total_bytes < StorageQuota.limit_bytes,
            )
        elif status == "over_limit":
            statement = statement.where(
                StorageQuota.limit_bytes.is_not(None),
                total_bytes >= StorageQuota.limit_bytes,
            )
        elif status != "all":
            raise ValueError(f"Unsupported usage status: {status}")
        if sort == "used_asc":
            statement = statement.order_by(
                total_bytes.asc(),
                StorageUsage.subject_id.asc(),
            )
        elif sort == "percent_desc":
            percent = case(
                (StorageQuota.limit_bytes.is_(None), -1.0),
                (StorageQuota.limit_bytes == 0, 100.0),
                else_=total_bytes * 100.0 / StorageQuota.limit_bytes,
            )
            statement = statement.order_by(
                percent.desc(),
                StorageUsage.subject_id.asc(),
            )
        else:
            statement = statement.order_by(
                total_bytes.desc(),
                StorageUsage.subject_id.asc(),
            )

        return [
            UsageSummaryRow(
                subject_type=usage.subject_type,
                subject_id=usage.subject_id,
                parent_org_id=quota.parent_org_id if quota else None,
                limit_bytes=quota.limit_bytes if quota else None,
                max_file_bytes=quota.max_file_bytes if quota else None,
                bytes_used=usage.bytes_used,
                bytes_reserved=usage.bytes_reserved,
                files_count=usage.files_count,
                quota_status=quota.status if quota else None,
                recomputed_at=usage.recomputed_at,
                updated_at=usage.updated_at,
            )
            for usage, quota in (await self.db.execute(statement)).all()
        ]

    async def member_breakdown(
        self,
        *,
        organization_id: str,
    ) -> list[MemberUsageRow]:
        ready_in_org = (
            File.quota_org_id == organization_id,
            File.status == "ready",
            File.deleted_at.is_(None),
        )
        owned = (
            await self.db.execute(
                select(
                    File.owner_id,
                    func.coalesce(func.sum(File.size_bytes), 0),
                    func.count(File.id),
                )
                .where(*ready_in_org)
                .where(File.owner_type == "user")
                .group_by(File.owner_id)
            )
        ).all()
        uploaded = (
            await self.db.execute(
                select(
                    File.created_by,
                    func.coalesce(func.sum(File.size_bytes), 0),
                    func.count(File.id),
                )
                .where(*ready_in_org)
                .group_by(File.created_by)
            )
        ).all()
        caps = (
            await self.db.scalars(
                select(StorageQuota)
                .where(StorageQuota.subject_type == "user")
                .where(StorageQuota.parent_org_id == organization_id)
            )
        ).all()

        user_ids = (
            {str(user_id) for user_id, _, _ in owned}
            | {str(user_id) for user_id, _, _ in uploaded}
            | {quota.subject_id for quota in caps}
        )
        owned_by_user = {
            str(user_id): (int(bytes_used), int(files_count))
            for user_id, bytes_used, files_count in owned
        }
        uploaded_by_user = {
            str(user_id): (int(bytes_used), int(files_count))
            for user_id, bytes_used, files_count in uploaded
        }
        caps_by_user = {quota.subject_id: quota.limit_bytes for quota in caps}

        return [
            MemberUsageRow(
                user_id=user_id,
                owned_bytes=owned_by_user.get(user_id, (0, 0))[0],
                owned_files=owned_by_user.get(user_id, (0, 0))[1],
                uploaded_bytes=uploaded_by_user.get(user_id, (0, 0))[0],
                uploaded_files=uploaded_by_user.get(user_id, (0, 0))[1],
                limit_bytes=caps_by_user.get(user_id),
            )
            for user_id in sorted(user_ids)
        ]

    async def list_stale_subjects(
        self,
        *,
        limit: int,
    ) -> list[QuotaSubject]:
        """Subjects whose counters were recomputed least recently.

        Counters are a cache maintained by increments and decrements, so they
        can drift. Recomputing the oldest first means every subject is verified
        on a rotation rather than only the ones someone thought to check.
        """
        rows = (
            await self.db.execute(
                select(StorageUsage.subject_type, StorageUsage.subject_id)
                .order_by(
                    StorageUsage.recomputed_at.is_not(None),
                    StorageUsage.recomputed_at,
                    StorageUsage.subject_type,
                    StorageUsage.subject_id,
                )
                .limit(limit)
            )
        ).all()
        return [(subject_type, subject_id) for subject_type, subject_id in rows]

    async def _refresh(self, rows: Sequence[StorageUsage]) -> None:
        for row in rows:
            await self.db.refresh(row)


def _subjects_for_rows(
    rows: Sequence[StorageUsage],
) -> list[QuotaSubject]:
    return [(row.subject_type, row.subject_id) for row in rows]


def _validate_release_amounts(first: int, second: int) -> None:
    if first < 0 or second < 0:
        raise ValueError("Usage release amounts cannot be negative.")
