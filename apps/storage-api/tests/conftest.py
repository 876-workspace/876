from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from db.models import Base
from db.session import make_engine
from main import create_app
from providers.base import (
    CreateReadUrlInput,
    CreateReadUrlOutput,
    CreateUploadUrlInput,
    CreateUploadUrlOutput,
    DeleteObjectInput,
    DeleteObjectOutput,
    HeadObjectInput,
    HeadObjectOutput,
    ObjectStorageProvider,
)

NOW = 1_753_487_000


@dataclass
class InMemoryObjectStorageProvider(ObjectStorageProvider):
    objects: dict[tuple[str, str], tuple[str, int]] = field(default_factory=dict)
    create_upload_calls: list[CreateUploadUrlInput] = field(default_factory=list)
    head_calls: list[HeadObjectInput] = field(default_factory=list)
    create_read_calls: list[CreateReadUrlInput] = field(default_factory=list)
    delete_calls: list[DeleteObjectInput] = field(default_factory=list)

    async def create_upload_url(self, params: CreateUploadUrlInput) -> CreateUploadUrlOutput:
        self.create_upload_calls.append(params)
        return CreateUploadUrlOutput(
            url="https://upload.example.test/signed",
            headers={
                "Content-Type": params.content_type,
                "Content-Length": str(params.content_length),
            },
        )

    async def head_object(self, params: HeadObjectInput) -> HeadObjectOutput:
        self.head_calls.append(params)
        stored = self.objects.get((params.bucket, params.object_key))
        if stored is None:
            return HeadObjectOutput(exists=False)
        return HeadObjectOutput(exists=True, content_type=stored[0], content_length=stored[1])

    async def create_read_url(self, params: CreateReadUrlInput) -> CreateReadUrlOutput:
        self.create_read_calls.append(params)
        return CreateReadUrlOutput(url="https://read.example.test/signed")

    async def delete_object(self, params: DeleteObjectInput) -> DeleteObjectOutput:
        self.delete_calls.append(params)
        self.objects.pop((params.bucket, params.object_key), None)
        return DeleteObjectOutput(deleted=True)


@dataclass
class StorageHarness:
    client: TestClient
    provider: InMemoryObjectStorageProvider
    database_path: Path
    settings: Settings


async def _initialize_database(database_url: str) -> None:
    engine = make_engine(database_url)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    finally:
        await engine.dispose()


def make_settings(database_url: str, *, internal_key: str = "storage-test-key") -> Settings:
    return Settings(
        database_url=database_url,
        internal_key=internal_key,
        r2_assets_bucket="assets-test",
        r2_files_bucket="files-test",
        r2_endpoint="https://r2.example.test",
        r2_assets_base_url="https://assets.example.test",
        upload_ttl_seconds=600,
        deletion_mode="soft",
        environment="test",
        cors_allowed_origins="",
    )


@pytest.fixture
def storage_harness(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[StorageHarness]:
    database_path = tmp_path / "storage.db"
    database_url = f"sqlite+aiosqlite:///{database_path}"
    asyncio.run(_initialize_database(database_url))
    settings = make_settings(database_url)
    provider = InMemoryObjectStorageProvider()
    identifiers = {
        "file": "file_01TESTFILE",
        "upload_session": "upl_01TESTSESSION",
        "version": "ver_01TESTVERSION",
    }
    monkeypatch.setattr("domains.uploads.router.generate_id", lambda entity_type: identifiers[entity_type])
    monkeypatch.setattr("domains.uploads.router.time.time", lambda: NOW)
    monkeypatch.setattr("domains.files.router.time.time", lambda: NOW)
    app = create_app(settings, provider)
    with TestClient(app) as client:
        yield StorageHarness(
            client=client,
            provider=provider,
            database_path=database_path,
            settings=settings,
        )
