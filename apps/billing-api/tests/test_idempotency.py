from __future__ import annotations

import pytest
from starlette.requests import Request

from core.errors import AppHTTPException
from core.security import BillingPrincipal
from domains.billing.idempotency import canonicalize, integration_create_body


def request_with_idempotency_key(value: str | None) -> Request:
    headers = [] if value is None else [(b"idempotency-key", value.encode())]
    return Request({"type": "http", "method": "POST", "path": "/", "headers": headers})


def test_canonical_payload_matches_the_existing_typescript_contract() -> None:
    payload = {
        "payload": {"nested": [1, True], "name": "Ada"},
        "sourceExternalReference": "courier_1",
    }

    assert canonicalize(payload) == (
        'object:{"payload":object:{"name":string:"Ada","nested":array:[number:1,boolean:true]},'
        '"sourceExternalReference":string:"courier_1"}'
    )


def test_app_attribution_overrides_spoofed_fields_and_hashes_payload() -> None:
    body = integration_create_body(
        request_with_idempotency_key("delivery_123"),
        BillingPrincipal(kind="app_api_key", app_id="app_courier"),
        {
            "name": "Ada",
            "nested": [1, True],
            "sourceExternalReference": "courier_1",
            "sourceAppId": "app_spoofed",
            "sourcePayloadHash": "spoofed",
        },
    )

    assert body["sourceAppId"] == "app_courier"
    assert body["sourceIdempotencyKey"] == "delivery_123"
    assert body["sourceExternalReference"] == "courier_1"
    assert body["sourcePayloadHash"] == "f877ab4c000f065dccf3b99b7c3fc76c21e71565388ba96fbef46a26959c9857"


def test_app_create_requires_a_bounded_idempotency_key() -> None:
    with pytest.raises(AppHTTPException) as missing:
        integration_create_body(
            request_with_idempotency_key(None),
            BillingPrincipal(kind="oauth", app_id="app_courier"),
            {"name": "Ada"},
        )

    assert missing.value.status_code == 400
    assert missing.value.app_code == "billing/idempotency-key-required"


def test_internal_create_rejects_product_app_attribution() -> None:
    with pytest.raises(AppHTTPException) as invalid:
        integration_create_body(
            request_with_idempotency_key(None),
            BillingPrincipal(kind="internal", platform_admin=True),
            {"name": "Ada", "sourceExternalReference": "courier_1"},
        )

    assert invalid.value.status_code == 422
