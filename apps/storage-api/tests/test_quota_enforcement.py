"""Quota admission and reservation lifecycle behavior."""

from __future__ import annotations

import asyncio
import secrets
import sqlite3
from collections.abc import Callable
from typing import Any

import pytest
from fastapi import status
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.bytes import format_bytes
from core.config import Settings
from core.errors import AppHTTPException
from core.observability import StorageOperationContext
from db.models import Base, File, StorageQuota, StorageUsage, UploadSession
from db.session import make_engine
from domains.uploads.quota import admit_upload, finalize_reservation
from domains.uploads.routes import UPLOAD_ROUTES, UploadRoute
from domains.uploads.schemas import UploadCreate
from providers.base import HeadObjectInput, HeadObjectOutput
from tests.conftest import NOW, StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    OBJECT_KEY,
    make_uploaded_object,
    open_upload,
)


def _set_quota(
    harness: StorageHarness,
    *,
    subject_type: str = "organization",
    subject_id: str = "org_123",
    parent_org_id: str | None = None,
    limit_bytes: int | None = 1_000_000,
    max_file_bytes: int | None = None,
    quota_status: str = "active",
) -> None:
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            """
            INSERT INTO storage_quotas (
                id, subject_type, subject_id, parent_org_id, limit_bytes,
                max_file_bytes, default_user_limit_bytes, source,
                plan_product_id, plan_slug, plan_name, status,
                entitlement_version, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, NULL, 'plan', 'prod_storage',
                '876-storage-included', 'Included', ?, 1, ?, ?
            )
            ON CONFLICT (subject_type, subject_id) DO UPDATE SET
                parent_org_id = excluded.parent_org_id,
                limit_bytes = excluded.limit_bytes,
                max_file_bytes = excluded.max_file_bytes,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                f"squota_{subject_type}_{subject_id}",
                subject_type,
                subject_id,
                parent_org_id,
                limit_bytes,
                max_file_bytes,
                quota_status,
                NOW,
                NOW,
            ),
        )
        connection.commit()


def _set_usage(
    harness: StorageHarness,
    *,
    subject_type: str = "organization",
    subject_id: str = "org_123",
    bytes_used: int = 0,
    bytes_reserved: int = 0,
    files_count: int = 0,
) -> None:
    with sqlite3.connect(harness.database_path) as connection:
        connection.execute(
            """
            INSERT INTO storage_usage (
                subject_type, subject_id, bytes_used, bytes_reserved,
                files_count, recomputed_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, NULL, ?)
            ON CONFLICT (subject_type, subject_id) DO UPDATE SET
                bytes_used = excluded.bytes_used,
                bytes_reserved = excluded.bytes_reserved,
                files_count = excluded.files_count,
                updated_at = excluded.updated_at
            """,
            (
                subject_type,
                subject_id,
                bytes_used,
                bytes_reserved,
                files_count,
                NOW,
            ),
        )
        connection.commit()


def _usage(
    harness: StorageHarness,
    subject_type: str = "organization",
    subject_id: str = "org_123",
) -> tuple[int, int, int]:
    with sqlite3.connect(harness.database_path) as connection:
        row = connection.execute(
            """
            SELECT bytes_used, bytes_reserved, files_count
              FROM storage_usage
             WHERE subject_type = ? AND subject_id = ?
            """,
            (subject_type, subject_id),
        ).fetchone()
    if row is None:
        return 0, 0, 0
    return int(row[0]), int(row[1]), int(row[2])


def _table_count(harness: StorageHarness, table: str) -> int:
    assert table in {"storage_files", "storage_upload_sessions"}
    with sqlite3.connect(harness.database_path) as connection:
        count = connection.execute(
            f"SELECT COUNT(*) FROM {table}"  # noqa: S608 - fixed allow-list above
        ).fetchone()
    assert count is not None
    return int(count[0])


def _reservation_released_at(harness: StorageHarness) -> int | None:
    with sqlite3.connect(harness.database_path) as connection:
        row = connection.execute(
            """
            SELECT reservation_released_at
              FROM storage_upload_sessions
             WHERE id = 'upl_01TESTSESSION'
            """
        ).fetchone()
    assert row is not None
    return int(row[0]) if row[0] is not None else None


def _install_user_route(
    monkeypatch: pytest.MonkeyPatch,
    *,
    max_size_bytes: int = 10_000_000,
) -> UploadRoute:
    route = UploadRoute(
        key="user.testFile",
        purpose="user_test_file",
        owner_type="user",
        allowed_content_types=("image/png",),
        max_size_bytes=max_size_bytes,
        category="library",
        audience="private",
        key_template="users/{owner_id}/files/{file_id}/{version_id}",
    )
    monkeypatch.setitem(UPLOAD_ROUTES, route.key, route)
    return route


def _open_user_upload(
    harness: StorageHarness,
    *,
    size_bytes: int,
    quota_org_id: str = "org_123",
) -> Any:
    return harness.client.post(
        "/v1/uploads",
        headers=AUTH_HEADERS,
        json={
            "route_key": "user.testFile",
            "owner_type": "user",
            "owner_id": "user_456",
            "actor_user_id": "user_456",
            "source_app_id": "876-couriers",
            "quota_org_id": quota_org_id,
            "file_name": "document.png",
            "content_type": "image/png",
            "size_bytes": size_bytes,
        },
    )


def test_format_bytes_uses_si_units_for_user_facing_prose() -> None:
    assert format_bytes(0) == "0 B"
    assert format_bytes(999) == "999 B"
    assert format_bytes(1_000) == "1 kB"
    assert format_bytes(3_100_000) == "3.1 MB"
    assert format_bytes(5_000_000_000) == "5 GB"


def test_upload_that_fits_reserves_exactly_the_declared_bytes(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)

    response = open_upload(storage_harness, {"size_bytes": 60_000})

    assert response.status_code == 201
    assert _usage(storage_harness) == (0, 60_000, 0)
    assert len(storage_harness.provider.create_upload_calls) == 1


def test_upload_that_exactly_reaches_the_limit_is_admitted(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=84_213)

    response = open_upload(storage_harness)

    assert response.status_code == 201
    assert _usage(storage_harness) == (0, 84_213, 0)
    assert len(storage_harness.provider.create_upload_calls) == 1


def test_upload_one_byte_over_is_rejected_without_rows_or_provider_call(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=84_212)

    response = open_upload(storage_harness)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "storage/quota-exceeded"
    assert _table_count(storage_harness, "storage_files") == 0
    assert _table_count(storage_harness, "storage_upload_sessions") == 0
    assert storage_harness.provider.create_upload_calls == []
    assert _usage(storage_harness) == (0, 0, 0)


def test_quota_rejection_message_names_requested_remaining_and_total_bytes(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=5_000_000)
    _set_usage(storage_harness, bytes_used=1_900_000)

    response = open_upload(storage_harness, {"size_bytes": 3_200_000})

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "storage/quota-exceeded",
            "message": (
                "This upload needs 3.2 MB but only 3.1 MB of "
                "the organization's 5 MB storage remains."
            ),
        }
    }
    assert storage_harness.provider.create_upload_calls == []


@pytest.mark.asyncio
async def test_concurrent_admissions_serialize_on_the_postgres_usage_row() -> None:
    settings = Settings()
    if not settings.database_url.startswith(("postgres://", "postgresql://")):
        pytest.skip("A configured PostgreSQL test database is required.")

    schema = f"quota_test_{secrets.token_hex(8)}"
    engine = make_engine(settings.database_url)
    schema_created = False
    try:
        async with engine.begin() as connection:
            await connection.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
            schema_created = True
        schema_engine = engine.execution_options(
            schema_translate_map={None: schema}
        )
        async with schema_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(
                insert(StorageQuota).values(
                    id="squota_concurrent",
                    subject_type="organization",
                    subject_id="org_concurrent",
                    limit_bytes=100,
                    source="plan",
                    status="active",
                    entitlement_version=1,
                    created_at=NOW,
                    updated_at=NOW,
                )
            )
            await connection.execute(
                insert(StorageUsage).values(
                    subject_type="organization",
                    subject_id="org_concurrent",
                    bytes_used=0,
                    bytes_reserved=0,
                    files_count=0,
                    updated_at=NOW,
                )
            )

        route = UPLOAD_ROUTES["organization.primaryLogo"]
        body = UploadCreate(
            route_key=route.key,
            owner_type="organization",
            owner_id="org_concurrent",
            actor_user_id="user_concurrent",
            source_app_id="app_concurrent",
            file_name="logo.png",
            content_type="image/png",
            size_bytes=60,
        )
        start = asyncio.Event()

        async def attempt() -> str:
            async with schema_engine.connect() as connection, AsyncSession(
                bind=connection,
                expire_on_commit=False,
            ) as session:
                await start.wait()
                try:
                    await admit_upload(
                        session,
                        body=body,
                        route=route,
                        settings=settings,
                        context=StorageOperationContext(
                            source_app_id="app_concurrent",
                            actor_id="user_concurrent",
                            owner_id="org_concurrent",
                            file_id=None,
                            upload_session_id=None,
                            route_key=route.key,
                        ),
                        now=NOW,
                    )
                except AppHTTPException as exc:
                    await session.rollback()
                    return exc.app_code

                await session.commit()
                return "admitted"

        first = asyncio.create_task(attempt())
        second = asyncio.create_task(attempt())
        start.set()
        results = await asyncio.gather(first, second)

        assert sorted(results) == ["admitted", "storage/quota-exceeded"]

        async with schema_engine.connect() as connection:
            reserved = await connection.scalar(
                select(StorageUsage.bytes_reserved).where(
                    StorageUsage.subject_type == "organization",
                    StorageUsage.subject_id == "org_concurrent",
                )
            )
        assert reserved == 60
    finally:
        if schema_created:
            async with engine.begin() as connection:
                await connection.exec_driver_sql(
                    f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'
                )
        await engine.dispose()


def test_user_owned_upload_checks_member_cap_and_org_pool(
    storage_harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_user_route(monkeypatch)
    _set_quota(
        storage_harness,
        subject_type="user",
        subject_id="user_456",
        parent_org_id="org_123",
        limit_bytes=50,
    )
    _set_quota(storage_harness, limit_bytes=100)

    response = _open_user_upload(storage_harness, size_bytes=51)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "storage/quota-exceeded"
    assert _usage(storage_harness, "user", "user_456") == (0, 0, 0)
    assert _usage(storage_harness) == (0, 0, 0)
    assert storage_harness.provider.create_upload_calls == []


def test_user_upload_is_rejected_when_member_fits_but_org_pool_does_not(
    storage_harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_user_route(monkeypatch)
    _set_quota(
        storage_harness,
        subject_type="user",
        subject_id="user_456",
        parent_org_id="org_123",
        limit_bytes=100,
    )
    _set_quota(storage_harness, limit_bytes=49)

    response = _open_user_upload(storage_harness, size_bytes=50)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "storage/quota-exceeded"
    assert _usage(storage_harness, "user", "user_456") == (0, 0, 0)
    assert _usage(storage_harness) == (0, 0, 0)
    assert storage_harness.provider.create_upload_calls == []


def test_org_owned_upload_does_not_consume_the_uploaders_member_cap(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    _set_quota(
        storage_harness,
        subject_type="user",
        subject_id="user_456",
        parent_org_id="org_123",
        limit_bytes=1,
    )

    response = open_upload(storage_harness, {"size_bytes": 50_000})

    assert response.status_code == 201
    assert _usage(storage_harness) == (0, 50_000, 0)
    assert _usage(storage_harness, "user", "user_456") == (0, 0, 0)


def test_org_owned_upload_ignores_a_supplied_different_quota_org(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    _set_quota(
        storage_harness,
        subject_id="org_other",
        limit_bytes=0,
    )

    response = open_upload(
        storage_harness,
        {
            "size_bytes": 50_000,
            "quota_org_id": "org_other",
        },
    )

    assert response.status_code == 201
    assert _usage(storage_harness) == (0, 50_000, 0)
    assert _usage(storage_harness, "organization", "org_other") == (0, 0, 0)
    with sqlite3.connect(storage_harness.database_path) as connection:
        quota_org_id = connection.execute(
            "SELECT quota_org_id FROM storage_files"
        ).fetchone()
    assert quota_org_id == ("org_123",)


def test_quota_org_id_must_be_a_valid_opaque_identifier(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)

    response = open_upload(
        storage_harness,
        {"quota_org_id": "../org_other"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "storage/invalid-request"
    assert storage_harness.provider.create_upload_calls == []
    assert _table_count(storage_harness, "storage_files") == 0
    assert _table_count(storage_harness, "storage_upload_sessions") == 0


def test_unlimited_quota_admits_a_route_legal_large_upload(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=None)

    response = open_upload(
        storage_harness,
        {"size_bytes": 5 * 1024 * 1024},
    )

    assert response.status_code == 201
    assert _usage(storage_harness) == (0, 5 * 1024 * 1024, 0)
    assert len(storage_harness.provider.create_upload_calls) == 1


def test_suspended_quota_rejects_without_creating_upload_state(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(
        storage_harness,
        limit_bytes=100_000,
        quota_status="suspended",
    )

    response = open_upload(storage_harness)

    assert response.status_code == 403
    assert response.json() == {
        "error": {
            "code": "storage/quota-suspended",
            "message": "Storage uploads for this subject are suspended.",
        }
    }
    assert _table_count(storage_harness, "storage_files") == 0
    assert _table_count(storage_harness, "storage_upload_sessions") == 0
    assert storage_harness.provider.create_upload_calls == []


def test_missing_quota_creates_and_enforces_the_platform_default(
    storage_harness: StorageHarness,
    capsys: pytest.CaptureFixture[str],
) -> None:
    capsys.readouterr()

    response = open_upload(storage_harness)
    output = capsys.readouterr().out

    assert response.status_code == 201
    with sqlite3.connect(storage_harness.database_path) as connection:
        quota = connection.execute(
            """
            SELECT source, limit_bytes, status
              FROM storage_quotas
             WHERE subject_type = 'organization'
               AND subject_id = 'org_123'
            """
        ).fetchone()
    assert quota == ("default", 5_368_709_120, "active")
    assert output.count("storage.quota.missing_entitlement") == 1
    assert "subject_type=organization" in output
    assert "subject_id=org_123" in output


@pytest.mark.parametrize(
    ("max_file_bytes", "size_bytes"),
    [
        (1_000, 1_001),
        (10 * 1024 * 1024, 5 * 1024 * 1024 + 1),
    ],
)
def test_per_file_ceiling_is_the_smaller_of_plan_and_route(
    storage_harness: StorageHarness,
    max_file_bytes: int,
    size_bytes: int,
) -> None:
    _set_quota(
        storage_harness,
        limit_bytes=None,
        max_file_bytes=max_file_bytes,
    )

    response = open_upload(
        storage_harness,
        {"size_bytes": size_bytes},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "storage/file-too-large"
    assert storage_harness.provider.create_upload_calls == []
    assert _table_count(storage_harness, "storage_files") == 0
    assert _table_count(storage_harness, "storage_upload_sessions") == 0


def test_completion_moves_reserved_bytes_to_used_once(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    assert open_upload(storage_harness).status_code == 201
    assert _usage(storage_harness) == (0, 84_213, 0)
    make_uploaded_object(storage_harness)

    first = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    second = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert _usage(storage_harness) == (84_213, 0, 1)
    assert _reservation_released_at(storage_harness) == NOW
    assert storage_harness.provider.head_calls == [
        HeadObjectInput(bucket="assets-test", object_key=OBJECT_KEY)
    ]


def test_reservation_conversion_uses_verified_not_declared_length(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    assert open_upload(storage_harness).status_code == 201

    async def convert() -> None:
        engine = make_engine(
            f"sqlite+aiosqlite:///{storage_harness.database_path}"
        )
        try:
            async with AsyncSession(
                bind=engine,
                expire_on_commit=False,
            ) as session:
                upload_session = await session.get(
                    UploadSession,
                    "upl_01TESTSESSION",
                )
                file_row = await session.get(File, "file_01TESTFILE")
                assert upload_session is not None
                assert file_row is not None

                converted = await finalize_reservation(
                    session,
                    upload_session=upload_session,
                    file_row=file_row,
                    context=StorageOperationContext(
                        source_app_id=file_row.source_app_id,
                        actor_id=upload_session.created_by,
                        owner_id=file_row.owner_id,
                        file_id=file_row.id,
                        upload_session_id=upload_session.id,
                        route_key=upload_session.route_key,
                    ),
                    now=NOW,
                    verified_size_bytes=84_000,
                )
                assert converted is True
                await session.commit()
        finally:
            await engine.dispose()

    asyncio.run(convert())

    assert _usage(storage_harness) == (84_000, 0, 1)
    assert _reservation_released_at(storage_harness) == NOW


def test_reservation_underflow_emits_a_warning(
    storage_harness: StorageHarness,
    capsys: pytest.CaptureFixture[str],
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    assert open_upload(storage_harness).status_code == 201
    _set_usage(storage_harness, bytes_reserved=0)
    make_uploaded_object(storage_harness)
    capsys.readouterr()

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    output = capsys.readouterr().out

    assert response.status_code == 200
    assert _usage(storage_harness) == (84_213, 0, 1)
    assert output.count("storage.usage.underflow") == 1
    assert "released_bytes=84213" in output


FailureSetup = Callable[[StorageHarness, pytest.MonkeyPatch], None]


def _missing_object(
    _harness: StorageHarness,
    _monkeypatch: pytest.MonkeyPatch,
) -> None:
    return None


def _size_mismatch(
    harness: StorageHarness,
    _monkeypatch: pytest.MonkeyPatch,
) -> None:
    make_uploaded_object(harness, size_bytes=84_212)


def _content_type_mismatch(
    harness: StorageHarness,
    _monkeypatch: pytest.MonkeyPatch,
) -> None:
    make_uploaded_object(harness, content_type="image/jpeg")


def _expired(
    _harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "domains.uploads.router.time.time",
        lambda: NOW + 10_000,
    )


def _provider_error(
    harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fail_head(params: HeadObjectInput) -> HeadObjectOutput:
        harness.provider.head_calls.append(params)
        raise AppHTTPException(
            code="storage/provider-error",
            message="The storage provider could not complete the request.",
            http_status_code=status.HTTP_502_BAD_GATEWAY,
        )

    monkeypatch.setattr(harness.provider, "head_object", fail_head)


@pytest.mark.parametrize(
    ("setup", "expected_status"),
    [
        (_missing_object, 409),
        (_size_mismatch, 422),
        (_content_type_mismatch, 422),
        (_expired, 410),
        (_provider_error, 502),
    ],
)
def test_every_completion_failure_releases_the_reservation(
    storage_harness: StorageHarness,
    monkeypatch: pytest.MonkeyPatch,
    setup: FailureSetup,
    expected_status: int,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    assert open_upload(storage_harness).status_code == 201
    setup(storage_harness, monkeypatch)

    response = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert response.status_code == expected_status
    assert _usage(storage_harness) == (0, 0, 0)
    assert _reservation_released_at(storage_harness) == (
        NOW + 10_000 if setup is _expired else NOW
    )


def test_calling_a_failure_release_path_twice_decrements_exactly_once(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=100_000)
    assert open_upload(storage_harness).status_code == 201

    first = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )
    second = storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )

    assert first.status_code == 409
    assert second.status_code == 409
    assert _usage(storage_harness) == (0, 0, 0)
    assert _reservation_released_at(storage_harness) == NOW
    assert storage_harness.provider.head_calls == [
        HeadObjectInput(bucket="assets-test", object_key=OBJECT_KEY)
    ]


def test_smaller_upload_is_admitted_after_over_limit_rejection(
    storage_harness: StorageHarness,
) -> None:
    _set_quota(storage_harness, limit_bytes=50_000)

    rejected = open_upload(storage_harness, {"size_bytes": 50_001})
    admitted = open_upload(storage_harness, {"size_bytes": 50_000})

    assert rejected.status_code == 409
    assert admitted.status_code == 201
    assert _usage(storage_harness) == (0, 50_000, 0)
    assert _table_count(storage_harness, "storage_files") == 1
    assert _table_count(storage_harness, "storage_upload_sessions") == 1
    assert len(storage_harness.provider.create_upload_calls) == 1
