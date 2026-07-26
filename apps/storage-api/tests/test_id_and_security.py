"""ID generation and internal-key auth primitives."""

from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from core.id import ENTITY_PREFIXES, generate_id
from core.security import _secret_matches
from main import create_app
from tests.conftest import InMemoryObjectStorageProvider


def test_generate_id_uses_stable_prefixes() -> None:
    assert generate_id("file").startswith("file_")
    assert generate_id("upload_session").startswith("upl_")
    assert generate_id("version").startswith("ver_")


def test_generate_id_is_url_safe_and_unique() -> None:
    values = {generate_id("file") for _ in range(50)}

    assert len(values) == 50
    for value in values:
        assert re.fullmatch(r"file_[A-Za-z0-9_-]+", value)


def test_generate_id_rejects_unknown_entity_type() -> None:
    with pytest.raises(ValueError, match="Unknown entity type"):
        generate_id("folder")


def test_entity_prefixes_are_complete_for_current_entities() -> None:
    assert set(ENTITY_PREFIXES) == {"file", "upload_session", "version"}


def test_secret_matches_is_constant_time_equal() -> None:
    assert _secret_matches("storage-secret", "storage-secret") is True
    assert _secret_matches("storage-secret", "storage-secreT") is False
    assert _secret_matches("", "storage-secret") is False
    assert _secret_matches("storage-secret", "") is False


def test_require_internal_key_fails_closed_when_configured_key_is_empty() -> None:
    provider = InMemoryObjectStorageProvider()
    app = create_app(
        Settings(environment="test", internal_key="", database_url=""),
        provider,
    )
    with TestClient(app) as client:
        response = client.get("/v1/files/file_x", headers={"x-internal-key": "anything"})

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "storage/unauthorized",
            "message": "The storage service credential is invalid.",
        }
    }
    assert provider.create_upload_calls == []
    assert provider.head_calls == []
    assert provider.create_read_calls == []
    assert provider.delete_calls == []
