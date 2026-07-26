"""Exhaustive repository behavior against sqlite."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from db.models import Base
from db.repositories.files import FileRepository
from db.repositories.upload_sessions import UploadSessionRepository
from tests.conftest import make_engine


@pytest.fixture
def sessions(tmp_path: Path) -> async_sessionmaker[AsyncSession]:
    database_url = f"sqlite+aiosqlite:///{tmp_path / 'repo.db'}"
    engine = make_engine(database_url)

    async def prepare() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(prepare())
    return async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


def _file_kwargs(i: int = 1, **overrides: object) -> dict[str, Any]:
    data = {
        "id": f"file_{i}",
        "owner_type": "organization",
        "owner_id": "org_1",
        "source_app_id": "app_1",
        "purpose": "organization_logo",
        "category": "attachment",
        "audience": "public",
        "provider": "r2",
        "bucket": "assets",
        "object_key": f"organizations/org_1/branding/file_{i}/ver_1",
        "version_id": f"ver_{i}",
        "original_name": "logo.png",
        "content_type": "image/png",
        "size_bytes": 10,
        "status": "pending",
        "created_by": "user_1",
        "created_at": 100,
        "updated_at": 100,
    }
    data.update(overrides)
    return data


def test_create_many_and_get_each(sessions: async_sessionmaker[AsyncSession]) -> None:
    async def run() -> None:
        async with sessions() as session:
            repo = FileRepository(session)
            for i in range(1, 6):
                await repo.create(**_file_kwargs(i))
            for i in range(1, 6):
                found = await repo.get_by_id(f"file_{i}")
                assert found is not None
                assert found.object_key.endswith(f"file_{i}/ver_1")
            await session.commit()

    asyncio.run(run())


def test_get_missing_returns_none(sessions: async_sessionmaker[AsyncSession]) -> None:
    async def run() -> None:
        async with sessions() as session:
            assert await FileRepository(session).get_by_id("nope") is None

    asyncio.run(run())


def test_soft_delete_hides_from_default_get(sessions: async_sessionmaker[AsyncSession]) -> None:
    async def run() -> None:
        async with sessions() as session:
            repo = FileRepository(session)
            row = await repo.create(**_file_kwargs(1))
            await repo.delete(
                row,
                deletion_mode="soft",
                deleted_at=200,
                deleted_by="admin",
                deletion_reason="cleanup",
            )
            assert await repo.get_by_id("file_1") is None
            soft = await repo.get_by_id("file_1", include_deleted=True)
            assert soft is not None
            assert soft.deleted_by == "admin"
            assert soft.deletion_reason == "cleanup"
            assert soft.status == "deleted"
            assert soft.deleted_at == 200
            await session.commit()

    asyncio.run(run())


def test_mark_status_sequence(sessions: async_sessionmaker[AsyncSession]) -> None:
    async def run() -> None:
        async with sessions() as session:
            repo = FileRepository(session)
            row = await repo.create(**_file_kwargs(1))
            for status, ts in (("uploaded", 110), ("ready", 120), ("failed", 130)):
                await repo.mark_status(row, status=status, updated_at=ts)
                assert row.status == status
                assert row.updated_at == ts
            await session.commit()

    asyncio.run(run())


def test_upload_session_for_update_and_complete(
    sessions: async_sessionmaker[AsyncSession],
) -> None:
    async def run() -> None:
        async with sessions() as session:
            await FileRepository(session).create(**_file_kwargs(1))
            urepo = UploadSessionRepository(session)
            await urepo.create(
                id="upl_1",
                file_id="file_1",
                route_key="organization.primaryLogo",
                status="created",
                declared_content_type="image/png",
                declared_size_bytes=10,
                expires_at=999,
                created_by="user_1",
                created_at=100,
                updated_at=100,
            )
            locked = await urepo.get_by_id("upl_1", for_update=True)
            assert locked is not None
            await urepo.mark_status(locked, status="completed", updated_at=200, completed_at=200)
            assert locked.completed_at == 200
            assert locked.status == "completed"
            await session.commit()

    asyncio.run(run())


def test_upload_session_missing(sessions: async_sessionmaker[AsyncSession]) -> None:
    async def run() -> None:
        async with sessions() as session:
            assert await UploadSessionRepository(session).get_by_id("missing") is None

    asyncio.run(run())


@pytest.mark.parametrize("status", ["created", "completed", "failed", "expired"])
def test_upload_session_status_values(
    sessions: async_sessionmaker[AsyncSession],
    status: str,
) -> None:
    async def run() -> None:
        async with sessions() as session:
            await FileRepository(session).create(**_file_kwargs(1, id="file_s", object_key=f"k_{status}"))
            urepo = UploadSessionRepository(session)
            row = await urepo.create(
                id=f"upl_{status}",
                file_id="file_s",
                route_key="organization.primaryLogo",
                status="created",
                declared_content_type="image/png",
                declared_size_bytes=1,
                expires_at=1,
                created_by="u",
                created_at=1,
                updated_at=1,
            )
            await urepo.mark_status(row, status=status, updated_at=2)
            assert row.status == status
            await session.commit()

    asyncio.run(run())
