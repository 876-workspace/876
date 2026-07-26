"""Repository unit tests against sqlite."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from db.models import Base
from db.repositories.files import FileRepository
from db.repositories.upload_sessions import UploadSessionRepository
from db.session import make_engine


@pytest.fixture
def session_factory(tmp_path: Path) -> async_sessionmaker[AsyncSession]:
    database_url = f"sqlite+aiosqlite:///{tmp_path / 'repo.db'}"
    engine = make_engine(database_url)

    async def prepare() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(prepare())
    return async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


def test_file_repository_create_get_and_soft_delete(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run() -> None:
        async with session_factory() as session:
            repo = FileRepository(session)
            row = await repo.create(
                id="file_1",
                owner_type="organization",
                owner_id="org_1",
                source_app_id="876-couriers",
                purpose="organization_logo",
                category="attachment",
                audience="public",
                provider="r2",
                bucket="assets",
                object_key="organizations/org_1/branding/file_1/ver_1",
                version_id="ver_1",
                original_name="logo.png",
                content_type="image/png",
                size_bytes=10,
                status="pending",
                created_by="user_1",
                created_at=100,
                updated_at=100,
            )
            assert row.id == "file_1"
            found = await repo.get_by_id("file_1")
            assert found is not None
            assert found.status == "pending"

            await repo.mark_status(found, status="ready", updated_at=200)
            assert found.status == "ready"
            assert found.updated_at == 200

            await repo.delete(
                found,
                deletion_mode="soft",
                deleted_at=300,
                deleted_by="user_1",
                deletion_reason="test",
            )
            assert await repo.get_by_id("file_1") is None
            soft = await repo.get_by_id("file_1", include_deleted=True)
            assert soft is not None
            assert soft.deleted_at == 300
            assert soft.status == "deleted"
            await session.commit()

    asyncio.run(run())


def test_file_repository_hard_delete(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run() -> None:
        async with session_factory() as session:
            repo = FileRepository(session)
            row = await repo.create(
                id="file_2",
                owner_type="organization",
                owner_id="org_1",
                source_app_id="876-couriers",
                purpose="organization_logo",
                category="attachment",
                audience="public",
                provider="r2",
                bucket="assets",
                object_key="organizations/org_1/branding/file_2/ver_1",
                version_id="ver_1",
                original_name="logo.png",
                content_type="image/png",
                size_bytes=10,
                status="ready",
                created_by="user_1",
                created_at=100,
                updated_at=100,
            )
            await repo.delete(
                row,
                deletion_mode="hard",
                deleted_at=300,
                deleted_by=None,
                deletion_reason=None,
            )
            assert await repo.get_by_id("file_2", include_deleted=True) is None
            await session.commit()

    asyncio.run(run())


def test_upload_session_repository_lifecycle(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    async def run() -> None:
        async with session_factory() as session:
            files = FileRepository(session)
            await files.create(
                id="file_3",
                owner_type="organization",
                owner_id="org_1",
                source_app_id="876-couriers",
                purpose="organization_logo",
                category="attachment",
                audience="public",
                provider="r2",
                bucket="assets",
                object_key="organizations/org_1/branding/file_3/ver_1",
                version_id="ver_1",
                original_name="logo.png",
                content_type="image/png",
                size_bytes=10,
                status="pending",
                created_by="user_1",
                created_at=100,
                updated_at=100,
            )
            sessions = UploadSessionRepository(session)
            session_row = await sessions.create(
                id="upl_3",
                file_id="file_3",
                route_key="organization.primaryLogo",
                status="created",
                declared_content_type="image/png",
                declared_size_bytes=10,
                expires_at=700,
                created_by="user_1",
                created_at=100,
                updated_at=100,
            )
            found = await sessions.get_by_id("upl_3")
            assert found is not None
            assert found.id == session_row.id

            locked = await sessions.get_by_id("upl_3", for_update=True)
            assert locked is not None
            await sessions.mark_status(locked, status="completed", updated_at=200, completed_at=200)
            assert locked.status == "completed"
            assert locked.completed_at == 200
            await session.commit()

    asyncio.run(run())
