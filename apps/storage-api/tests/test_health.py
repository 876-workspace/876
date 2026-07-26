"""Health and readiness endpoint contracts."""

from __future__ import annotations

from fastapi.testclient import TestClient

from core.config import Settings
from main import create_app
from tests.conftest import StorageHarness


def test_health_is_public_and_returns_service_identity() -> None:
    app = create_app(Settings(environment="test", internal_key=""))
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "object": "health",
        "status": "ok",
        "service": "@876/storage-api",
    }


def test_health_does_not_require_internal_key() -> None:
    app = create_app(Settings(environment="test", internal_key="secret"))
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ready_is_not_ready_when_database_is_missing() -> None:
    app = create_app(Settings(environment="test", database_url="", internal_key=""))
    with TestClient(app) as client:
        response = client.get("/ready")

    assert response.status_code == 503
    assert response.json() == {
        "object": "readiness",
        "status": "not_ready",
        "service": "@876/storage-api",
    }


def test_ready_is_ready_when_sqlite_database_is_configured(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {
        "object": "readiness",
        "status": "ready",
        "service": "@876/storage-api",
    }


def test_ready_does_not_require_internal_key(storage_harness: StorageHarness) -> None:
    response = storage_harness.client.get("/ready")

    assert response.status_code == 200
    assert "error" not in response.json()
