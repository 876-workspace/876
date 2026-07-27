"""The deleted-file revival guard, and listing objects that need reclaiming."""

from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import async_sessionmaker

from db.repositories.files import FileRepository
from db.session import make_engine
from tests.conftest import StorageHarness
from tests.test_storage_api import (
    AUTH_HEADERS,
    database_value,
    make_uploaded_object,
    open_upload,
)


def _complete(storage_harness: StorageHarness) -> object:
    return storage_harness.client.post(
        "/v1/uploads/upl_01TESTSESSION/complete",
        headers=AUTH_HEADERS,
        json={},
    )


def test_completing_a_soft_deleted_file_does_not_revive_it(
    storage_harness: StorageHarness,
) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)

    file_id = database_value(
        storage_harness.database_path,
        "SELECT file_id FROM storage_upload_sessions WHERE id = ?",
        ("upl_01TESTSESSION",),
    )
    assert storage_harness.client.delete(
        f"/v1/files/{file_id}", headers=AUTH_HEADERS
    ).status_code == 200

    # Without the guard this flips status back to ready and returns a public
    # URL while deleted_at stays populated.
    response = _complete(storage_harness)
    assert response.status_code == 404  # type: ignore[attr-defined]
    assert response.json()["error"]["code"] == "storage/file-not-found"  # type: ignore[attr-defined]

    assert (
        database_value(
            storage_harness.database_path,
            "SELECT status FROM storage_files WHERE id = ?",
            (file_id,),
        )
        != "ready"
    )


def test_soft_deleted_files_are_listed_for_reclamation(
    storage_harness: StorageHarness,
) -> None:
    assert open_upload(storage_harness).status_code == 201
    make_uploaded_object(storage_harness)
    assert _complete(storage_harness).status_code == 200  # type: ignore[attr-defined]

    file_id = database_value(
        storage_harness.database_path,
        "SELECT id FROM storage_files LIMIT 1",
        (),
    )
    storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)

    async def check() -> None:
        engine = make_engine(f"sqlite+aiosqlite:///{storage_harness.database_path}")
        try:
            async with async_sessionmaker(engine, expire_on_commit=False)() as db:
                repository = FileRepository(db)
                pending = await repository.list_reclaimable(limit=10)
                assert [row.id for row in pending] == [file_id]

                # Terminal status is the marker, so a reclaimed row is not
                # returned again on the next run.
                await repository.mark_purged(pending[0], purged_at=1)
                await db.commit()
                assert await repository.list_reclaimable(limit=10) == []
        finally:
            await engine.dispose()

    asyncio.run(check())
