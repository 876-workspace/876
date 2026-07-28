"""Original filename is metadata only — never enters object key."""

from __future__ import annotations

import sqlite3

import pytest

from tests.conftest import StorageHarness
from tests.test_storage_api import OBJECT_KEY, open_upload

FILENAMES = [
    "logo.png",
    "../../../etc/passwd",
    "C:\\Windows\\System32\\x.png",
    "file with spaces.png",
    "unicodé-名字.png",
    "';'; DROP TABLE files;--.png",
    "<script>alert(1)</script>.png",
    "a" * 500 + ".png",
    ".hidden",
    "....png",
    "logo.PNG.EXE",
    "\n\r\t.png",
]


@pytest.mark.parametrize("file_name", FILENAMES)
def test_filename_never_leaks_into_object_key(
    storage_harness: StorageHarness,
    file_name: str,
) -> None:
    response = open_upload(storage_harness, {"file_name": file_name})
    assert response.status_code == 201

    with sqlite3.connect(storage_harness.database_path) as connection:
        original_name, object_key = connection.execute(
            "SELECT original_name, object_key FROM storage_files WHERE id = ?",
            ("file_01TESTFILE",),
        ).fetchone()

    assert original_name == file_name
    assert object_key == OBJECT_KEY
    assert "passwd" not in object_key
    assert "script" not in object_key
    assert "Windows" not in object_key
    assert " " not in object_key
