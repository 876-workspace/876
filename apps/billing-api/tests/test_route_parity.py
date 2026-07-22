from __future__ import annotations

import json
from pathlib import Path

from core.config import Settings
from domains.billing.generated_routes import ROUTES
from domains.billing.resources import resource_for_path
from main import create_app


def test_fastapi_registers_every_frozen_v1_operation() -> None:
    app = create_app(Settings(environment="test"))
    schema = app.openapi()
    actual = {
        (path, method.upper())
        for path, path_item in schema["paths"].items()
        for method in path_item
        if method.upper() in {"DELETE", "GET", "PATCH", "POST", "PUT"}
    }
    expected = {(route.path, route.method) for route in ROUTES}

    assert actual == expected


def test_every_operation_has_a_resource_or_dedicated_system_handler() -> None:
    dedicated_paths = {
        "/admin/billing/run",
        "/admin/stats/apps",
        "/admin/stats/apps/{sourceAppId}",
        "/integrations/organizations/{organizationId}",
    }

    unmapped = {
        route.path for route in ROUTES if route.path not in dedicated_paths and resource_for_path(route.path) is None
    }

    assert unmapped == set()


def test_generated_route_registry_is_unique() -> None:
    operations = [(route.path, route.method) for route in ROUTES]

    assert len(operations) == len(set(operations))


def test_openapi_declares_the_frozen_auth_tier_for_each_operation() -> None:
    schema = create_app(Settings(environment="test")).openapi()

    for route in ROUTES:
        security = schema["paths"][route.path][route.method.lower()]["security"]
        if route.auth_tier == "admin":
            assert security == [{"internalKey": []}]
        elif route.auth_tier == "integration":
            assert security == [
                {"internalKey": []},
                {"appApiKey": []},
                {"tenantOAuth": [route.scope]},
            ]
        else:
            assert security == [{"tenantOAuth": []}]


def test_openapi_preserves_frozen_request_and_response_contracts() -> None:
    contract_path = Path(__file__).resolve().parents[2] / "billing" / "contracts" / "v1" / "openapi.json"
    frozen = json.loads(contract_path.read_text(encoding="utf-8"))
    actual = create_app(Settings(environment="test")).openapi()

    assert actual["components"]["schemas"] | frozen["components"]["schemas"] == actual["components"]["schemas"]
    methods = {"delete", "get", "patch", "post", "put"}
    for path, path_item in frozen["paths"].items():
        for method, expected_operation in path_item.items():
            if method not in methods:
                continue
            actual_operation = actual["paths"][path][method]
            for field in ("summary", "description", "operationId", "parameters", "requestBody", "responses"):
                assert actual_operation.get(field) == expected_operation.get(field), (method, path, field)
