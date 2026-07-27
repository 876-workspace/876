"""Quota and usage repository behavior against a real database."""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, create_engine, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from core.config import get_settings
from db.models import (
    Base,
    File,
    StorageQuota,
    StorageUsage,
    UploadSession,
)
from db.repositories.quotas import QuotaRepository
from db.repositories.usage import UsageRepository
from tests.conftest import make_engine


@pytest.fixture
def quota_database(
    tmp_path: Path,
) -> Iterator[tuple[AsyncEngine, async_sessionmaker[AsyncSession]]]:
    database_url = f"sqlite+aiosqlite:///{tmp_path / 'quotas.db'}"
    engine = make_engine(database_url)

    async def prepare() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(prepare())
    yield engine, async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    asyncio.run(engine.dispose())


async def _upsert_quota(
    session: AsyncSession,
    *,
    subject_type: str = "organization",
    subject_id: str = "org_1",
    parent_org_id: str | None = None,
    limit_bytes: int | None = 1_000,
    status: str = "active",
    version: int = 1,
    now: int = 100,
) -> StorageQuota:
    return await QuotaRepository(session).upsert_from_entitlement(
        subject_type=subject_type,
        subject_id=subject_id,
        parent_org_id=parent_org_id,
        limit_bytes=limit_bytes,
        max_file_bytes=100,
        default_user_limit_bytes=None,
        plan_product_id="prod_storage",
        plan_slug="876-storage-included",
        plan_name="Included",
        status=status,
        entitlement_version=version,
        now=now,
    )


def _add_file(
    session: AsyncSession,
    *,
    file_id: str,
    owner_type: str = "organization",
    owner_id: str = "org_1",
    quota_org_id: str | None = "org_1",
    created_by: str = "user_1",
    size_bytes: int = 10,
    status: str = "ready",
    deleted_at: int | None = None,
) -> File:
    row = File(
        id=file_id,
        owner_type=owner_type,
        owner_id=owner_id,
        source_app_id="app_couriers",
        purpose="organization_logo",
        category="attachment",
        audience="public",
        provider="r2",
        bucket="assets",
        object_key=f"organizations/org_1/{file_id}",
        version_id=f"ver_{file_id}",
        original_name=f"{file_id}.png",
        content_type="image/png",
        size_bytes=size_bytes,
        status=status,
        created_by=created_by,
        quota_org_id=quota_org_id,
        created_at=100,
        updated_at=100,
        deleted_at=deleted_at,
    )
    session.add(row)
    return row


def _add_session(
    session: AsyncSession,
    *,
    session_id: str,
    file_id: str,
    size_bytes: int,
    status: str = "created",
    expires_at: int = 1_000,
    reservation_released_at: int | None = None,
) -> UploadSession:
    row = UploadSession(
        id=session_id,
        file_id=file_id,
        route_key="organization.primaryLogo",
        status=status,
        declared_content_type="image/png",
        declared_size_bytes=size_bytes,
        expires_at=expires_at,
        reservation_released_at=reservation_released_at,
        created_by="user_1",
        created_at=100,
        updated_at=100,
    )
    session.add(row)
    return row


@pytest.mark.asyncio
async def test_quota_subject_is_unique_and_creates_one_usage_row(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        first = await _upsert_quota(session)
        usage = await session.get(
            StorageUsage,
            ("organization", "org_1"),
        )

        assert first.id.startswith("squota_")
        assert usage is not None
        assert usage.bytes_used == 0
        assert usage.bytes_reserved == 0
        assert usage.files_count == 0

        session.add(
            StorageQuota(
                id="squota_duplicate",
                subject_type="organization",
                subject_id="org_1",
                limit_bytes=2_000,
                source="plan",
                status="active",
                entitlement_version=2,
                created_at=200,
                updated_at=200,
            )
        )
        with pytest.raises(IntegrityError):
            await session.flush()


@pytest.mark.asyncio
async def test_entitlement_upsert_ignores_lower_and_applies_equal_or_higher_versions(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        original = await _upsert_quota(
            session,
            limit_bytes=1_000,
            version=10,
            now=100,
        )
        lower = await _upsert_quota(
            session,
            limit_bytes=500,
            version=9,
            now=200,
        )

        assert lower.id == original.id
        assert lower.limit_bytes == 1_000
        assert lower.entitlement_version == 10
        assert lower.updated_at == 100

        equal = await _upsert_quota(
            session,
            limit_bytes=1_500,
            version=10,
            now=300,
        )
        assert equal.limit_bytes == 1_500
        assert equal.entitlement_version == 10
        assert equal.updated_at == 300

        higher = await _upsert_quota(
            session,
            limit_bytes=2_000,
            version=11,
            now=400,
        )
        assert higher.limit_bytes == 2_000
        assert higher.entitlement_version == 11
        assert higher.updated_at == 400


@pytest.mark.asyncio
async def test_ensure_default_is_idempotent(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        repository = QuotaRepository(session)
        first = await repository.ensure_default(
            subject_type="organization",
            subject_id="org_default",
            limit_bytes=5_368_709_120,
            now=100,
        )
        second = await repository.ensure_default(
            subject_type="organization",
            subject_id="org_default",
            limit_bytes=99,
            now=200,
        )
        count = len(
            (
                await session.scalars(
                    select(StorageQuota).where(
                        StorageQuota.subject_id == "org_default"
                    )
                )
            ).all()
        )

        assert second.id == first.id
        assert second.limit_bytes == 5_368_709_120
        assert second.source == "default"
        assert second.entitlement_version == 0
        assert count == 1


@pytest.mark.asyncio
async def test_reserve_commit_and_release_use_exact_arithmetic(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        repository = UsageRepository(session)
        rows = await repository.lock_for_update(
            [("organization", "org_1")],
            updated_at=100,
        )
        await repository.reserve(
            rows,
            bytes_to_reserve=40,
            updated_at=110,
        )

        assert rows[0].bytes_reserved == 40
        assert rows[0].bytes_used == 0
        assert rows[0].files_count == 0

        commit_underflows = await repository.commit_reservation(
            rows,
            reserved_bytes=40,
            used_bytes=40,
            updated_at=120,
        )
        assert commit_underflows == []
        assert rows[0].bytes_reserved == 0
        assert rows[0].bytes_used == 40
        assert rows[0].files_count == 1

        await repository.reserve(
            rows,
            bytes_to_reserve=15,
            updated_at=130,
        )
        release_underflows = await repository.release_reservation(
            rows,
            reserved_bytes=15,
            updated_at=140,
        )
        assert release_underflows == []
        assert rows[0].bytes_reserved == 0
        assert rows[0].bytes_used == 40
        assert rows[0].files_count == 1

        usage_underflows = await repository.release_usage(
            rows,
            used_bytes=40,
            files_count=1,
            updated_at=150,
        )
        assert usage_underflows == []
        assert rows[0].bytes_reserved == 0
        assert rows[0].bytes_used == 0
        assert rows[0].files_count == 0


@pytest.mark.asyncio
async def test_release_clamps_underflow_at_zero_and_reports_the_subject(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        repository = UsageRepository(session)
        rows = await repository.lock_for_update(
            [("organization", "org_underflow")],
            updated_at=100,
        )
        await repository.reserve(
            rows,
            bytes_to_reserve=5,
            updated_at=110,
        )
        rows[0].bytes_used = 7
        rows[0].files_count = 1
        await session.flush()

        reservation_underflows = await repository.release_reservation(
            rows,
            reserved_bytes=10,
            updated_at=120,
        )
        usage_underflows = await repository.release_usage(
            rows,
            used_bytes=8,
            files_count=2,
            updated_at=130,
        )

        assert reservation_underflows == [
            ("organization", "org_underflow")
        ]
        assert usage_underflows == [("organization", "org_underflow")]
        assert rows[0].bytes_reserved == 0
        assert rows[0].bytes_used == 0
        assert rows[0].files_count == 0


@pytest.mark.asyncio
async def test_recompute_counts_ready_live_files_and_open_reservations_only(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        _add_file(
            session,
            file_id="file_org_ready",
            size_bytes=100,
        )
        _add_file(
            session,
            file_id="file_user_ready",
            owner_type="user",
            owner_id="user_1",
            created_by="user_1",
            size_bytes=50,
        )
        _add_file(
            session,
            file_id="file_pending",
            size_bytes=30,
            status="pending",
        )
        _add_file(
            session,
            file_id="file_failed",
            size_bytes=40,
            status="failed",
        )
        _add_file(
            session,
            file_id="file_deleted",
            size_bytes=500,
            deleted_at=150,
        )
        _add_file(
            session,
            file_id="file_expired",
            size_bytes=60,
            status="pending",
        )
        _add_file(
            session,
            file_id="file_completed",
            size_bytes=70,
            status="ready",
        )
        _add_session(
            session,
            session_id="upl_open",
            file_id="file_pending",
            size_bytes=30,
            expires_at=1_000,
        )
        _add_session(
            session,
            session_id="upl_failed",
            file_id="file_failed",
            size_bytes=40,
            status="failed",
            expires_at=1_000,
        )
        _add_session(
            session,
            session_id="upl_expired",
            file_id="file_expired",
            size_bytes=60,
            expires_at=199,
        )
        _add_session(
            session,
            session_id="upl_completed",
            file_id="file_completed",
            size_bytes=70,
            status="completed",
            expires_at=1_000,
        )
        await session.flush()

        repository = UsageRepository(session)
        corrupted = (
            await repository.lock_for_update(
                [("organization", "org_1")],
                updated_at=100,
            )
        )[0]
        corrupted.bytes_used = 999
        corrupted.bytes_reserved = 999
        corrupted.files_count = 99
        await session.flush()

        result = await repository.recompute(
            subject_type="organization",
            subject_id="org_1",
            now=200,
        )

        assert result.before_bytes_used == 999
        assert result.before_bytes_reserved == 999
        assert result.before_files_count == 99
        assert result.bytes_used == 220
        assert result.bytes_reserved == 30
        assert result.files_count == 3
        assert result.delta_bytes == -1_748

        user_result = await repository.recompute(
            subject_type="user",
            subject_id="user_1",
            now=200,
        )
        assert user_result.bytes_used == 50
        assert user_result.bytes_reserved == 0
        assert user_result.files_count == 1


@pytest.mark.asyncio
async def test_member_breakdown_separates_owned_from_uploaded_bytes(
    quota_database: tuple[
        AsyncEngine,
        async_sessionmaker[AsyncSession],
    ],
) -> None:
    _, sessions = quota_database
    async with sessions() as session:
        _add_file(
            session,
            file_id="file_org_logo",
            created_by="user_a",
            size_bytes=100,
        )
        _add_file(
            session,
            file_id="file_a_owned",
            owner_type="user",
            owner_id="user_a",
            created_by="user_b",
            size_bytes=50,
        )
        _add_file(
            session,
            file_id="file_b_owned",
            owner_type="user",
            owner_id="user_b",
            created_by="user_b",
            size_bytes=25,
        )
        _add_file(
            session,
            file_id="file_deleted_member",
            owner_type="user",
            owner_id="user_a",
            created_by="user_a",
            size_bytes=500,
            deleted_at=150,
        )
        await _upsert_quota(
            session,
            subject_type="user",
            subject_id="user_a",
            parent_org_id="org_1",
            limit_bytes=60,
        )
        await _upsert_quota(
            session,
            subject_type="user",
            subject_id="user_c",
            parent_org_id="org_1",
            limit_bytes=None,
        )
        await session.flush()

        rows = await UsageRepository(session).member_breakdown(
            organization_id="org_1"
        )

        assert [
            (
                row.user_id,
                row.owned_bytes,
                row.owned_files,
                row.uploaded_bytes,
                row.uploaded_files,
                row.limit_bytes,
            )
            for row in rows
        ] == [
            ("user_a", 50, 1, 100, 1, 60),
            ("user_b", 25, 1, 75, 2, None),
            ("user_c", 0, 0, 0, 0, None),
        ]


def test_quota_migration_round_trips_and_backfills_existing_ready_files(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database_path = tmp_path / "migration.db"
    async_url = f"sqlite+aiosqlite:///{database_path}"
    sync_url = f"sqlite:///{database_path}"
    monkeypatch.setenv("STORAGE_DATABASE_URL", async_url)
    get_settings.cache_clear()
    config = Config("alembic.ini")

    try:
        command.upgrade(config, "202607270002")
        engine = create_engine(sync_url)
        with engine.begin() as connection:
            _insert_migration_file(
                connection,
                file_id="file_existing_org",
                owner_type="organization",
                owner_id="org_existing",
                size_bytes=400,
                status="ready",
                deleted_at=None,
            )
            _insert_migration_file(
                connection,
                file_id="file_existing_user",
                owner_type="user",
                owner_id="user_existing",
                size_bytes=200,
                status="ready",
                deleted_at=None,
            )
            _insert_migration_file(
                connection,
                file_id="file_deleted",
                owner_type="organization",
                owner_id="org_existing",
                size_bytes=100,
                status="ready",
                deleted_at=150,
            )
            _insert_migration_file(
                connection,
                file_id="file_pending",
                owner_type="organization",
                owner_id="org_existing",
                size_bytes=50,
                status="pending",
                deleted_at=None,
            )

        command.upgrade(config, "head")
        with engine.connect() as connection:
            tables = set(inspect(connection).get_table_names())
            file_columns = {
                column["name"]
                for column in inspect(connection).get_columns("storage_files")
            }
            session_columns = {
                column["name"]
                for column in inspect(connection).get_columns(
                    "storage_upload_sessions"
                )
            }
            usage = [
                tuple(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT subject_type, subject_id, bytes_used,
                               bytes_reserved, files_count
                          FROM storage_usage
                         ORDER BY subject_type, subject_id
                        """
                    )
                ).all()
            ]
            quota_org_ids = [
                tuple(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT id, quota_org_id
                          FROM storage_files
                         ORDER BY id
                        """
                    )
                ).all()
            ]

        assert {"storage_quotas", "storage_usage"}.issubset(tables)
        assert {"quota_org_id", "quota_released_at"}.issubset(file_columns)
        assert "reservation_released_at" in session_columns
        assert usage == [
            ("organization", "org_existing", 400, 0, 1),
            ("user", "user_existing", 200, 0, 1),
        ]
        assert quota_org_ids == [
            ("file_deleted", "org_existing"),
            ("file_existing_org", "org_existing"),
            ("file_existing_user", None),
            ("file_pending", "org_existing"),
        ]

        command.downgrade(config, "202607270002")
        with engine.connect() as connection:
            tables = set(inspect(connection).get_table_names())
            file_columns = {
                column["name"]
                for column in inspect(connection).get_columns("storage_files")
            }
            session_columns = {
                column["name"]
                for column in inspect(connection).get_columns(
                    "storage_upload_sessions"
                )
            }

        assert "storage_quotas" not in tables
        assert "storage_usage" not in tables
        assert "quota_org_id" not in file_columns
        assert "quota_released_at" not in file_columns
        assert "reservation_released_at" not in session_columns

        command.upgrade(config, "head")
        with engine.connect() as connection:
            rebuilt_usage = [
                tuple(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT subject_type, subject_id, bytes_used,
                               bytes_reserved, files_count
                          FROM storage_usage
                         ORDER BY subject_type, subject_id
                        """
                    )
                ).all()
            ]

        assert rebuilt_usage == [
            ("organization", "org_existing", 400, 0, 1),
            ("user", "user_existing", 200, 0, 1),
        ]
        engine.dispose()
    finally:
        get_settings.cache_clear()


def _insert_migration_file(
    connection: Connection,
    *,
    file_id: str,
    owner_type: str,
    owner_id: str,
    size_bytes: int,
    status: str,
    deleted_at: int | None,
) -> None:
    connection.execute(
        text(
            """
            INSERT INTO storage_files (
                id, owner_type, owner_id, source_app_id, purpose, category,
                audience, provider, bucket, object_key, version_id,
                original_name, content_type, size_bytes, status, created_by,
                created_at, updated_at, deleted_at, deleted_by,
                deletion_reason, purged_at
            ) VALUES (
                :id, :owner_type, :owner_id, 'app_couriers',
                'organization_logo', 'attachment', 'public', 'r2', 'assets',
                :object_key, :version_id, :original_name, 'image/png',
                :size_bytes, :status, 'user_1', 100, 100, :deleted_at,
                NULL, NULL, NULL
            )
            """
        ),
        {
            "id": file_id,
            "owner_type": owner_type,
            "owner_id": owner_id,
            "object_key": f"objects/{file_id}",
            "version_id": f"ver_{file_id}",
            "original_name": f"{file_id}.png",
            "size_bytes": size_bytes,
            "status": status,
            "deleted_at": deleted_at,
        },
    )
