from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, Mock

import httpx
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.security import require_api_key
from db.models import BillingCustomerOutbox, Organization, User
from main import create_app
from services.billing_customer_dispatch import (
    _mark_failed,
    dispatch_billing_customer_sync_once,
)
from services.billing_customer_sync import (
    customer_event_payload,
    enqueue_customer_ensure_for_organization,
    enqueue_reconcile_all,
)


def _organization() -> Organization:
    return Organization(id="org_1", name="Efesto Technologies")


def _user() -> User:
    return User(
        id="user_1",
        email="ada@example.com",
        first_name="Ada",
        last_name="Lovelace",
    )


async def test_enqueue_deduplicates_pending_organization_event() -> None:
    db = SimpleNamespace(
        scalars=AsyncMock(
            side_effect=[
                SimpleNamespace(first=lambda: None),
                SimpleNamespace(first=lambda: "bce_existing"),
            ]
        ),
        add=Mock(),
        flush=AsyncMock(),
    )

    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)

    assert db.add.call_count == 1
    event = db.add.call_args.args[0]
    assert event.status == "pending"
    assert event.subject_type == "organization"
    assert event.subject_id == "org_1"


def test_customer_payloads_match_billing_contract() -> None:
    organization_event = BillingCustomerOutbox(
        subject_type="organization",
        subject_id="org_1",
        name="Efesto Technologies",
        email=None,
    )
    user_event = BillingCustomerOutbox(
        subject_type="user",
        subject_id="user_1",
        name="Ada Lovelace",
        email="ada@example.com",
    )

    assert customer_event_payload(organization_event) == {
        "customerType": "CORE_ORGANIZATION",
        "organizationId": "org_1",
        "name": "Efesto Technologies",
        "email": None,
    }
    assert customer_event_payload(user_event) == {
        "customerType": "CORE_USER",
        "userId": "user_1",
        "name": "Ada Lovelace",
        "email": "ada@example.com",
    }


async def test_reconcile_returns_new_event_counts() -> None:
    db = SimpleNamespace(
        scalars=AsyncMock(
            side_effect=[
                SimpleNamespace(all=lambda: [_organization()]),
                SimpleNamespace(all=lambda: [_user()]),
                SimpleNamespace(first=lambda: None),
                SimpleNamespace(first=lambda: None),
            ]
        ),
        add=Mock(),
        flush=AsyncMock(),
    )

    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 100)

    assert counts == {"organizations": 1, "users": 1}
    assert db.add.call_count == 2


class _SessionContext:
    def __init__(self, session: Any) -> None:
        self.session = session

    async def __aenter__(self) -> Any:
        return self.session

    async def __aexit__(self, *_args: object) -> None:
        return None


class _ClientContext:
    def __init__(self, response: httpx.Response) -> None:
        self.response = response
        self.post = AsyncMock(return_value=response)

    async def __aenter__(self) -> "_ClientContext":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None


async def test_dispatch_marks_delivered_on_success(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(
        id="bce_1",
        subject_type="user",
        subject_id="user_1",
        name="Ada Lovelace",
        email="ada@example.com",
        attempt_count=1,
    )
    session = SimpleNamespace(commit=AsyncMock())
    delivered = AsyncMock()
    monkeypatch.setattr("services.billing_customer_dispatch.AsyncSessionLocal", lambda: _SessionContext(session))
    monkeypatch.setattr(
        "services.billing_customer_dispatch.claim_billing_customer_events",
        AsyncMock(return_value=[event]),
    )
    monkeypatch.setattr("services.billing_customer_dispatch._mark_delivered", delivered)
    client = _ClientContext(httpx.Response(204, request=httpx.Request("POST", "https://billing.test")))
    monkeypatch.setattr("services.billing_customer_dispatch.httpx.AsyncClient", lambda **_kwargs: client)

    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="secret")
    )

    assert (summary.claimed, summary.delivered, summary.failed) == (1, 1, 0)
    delivered.assert_awaited_once_with("bce_1")
    assert client.post.await_args is not None
    assert client.post.await_args.kwargs["headers"]["x-request-id"] == "bce_1"


async def test_dispatch_marks_failed_on_http_error(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(
        id="bce_1",
        subject_type="organization",
        subject_id="org_1",
        name="Efesto Technologies",
        email=None,
        attempt_count=2,
    )
    session = SimpleNamespace(commit=AsyncMock())
    failed = AsyncMock()
    monkeypatch.setattr("services.billing_customer_dispatch.AsyncSessionLocal", lambda: _SessionContext(session))
    monkeypatch.setattr(
        "services.billing_customer_dispatch.claim_billing_customer_events",
        AsyncMock(return_value=[event]),
    )
    monkeypatch.setattr("services.billing_customer_dispatch._mark_failed", failed)
    client = _ClientContext(httpx.Response(503, request=httpx.Request("POST", "https://billing.test")))
    monkeypatch.setattr("services.billing_customer_dispatch.httpx.AsyncClient", lambda **_kwargs: client)

    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="secret")
    )

    assert (summary.claimed, summary.delivered, summary.failed) == (1, 0, 1)
    assert failed.await_args is not None
    assert failed.await_args.args[:2] == ("bce_1", 2)


async def test_failed_delivery_is_retried_with_backoff(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(id="bce_1", status="processing", attempt_count=3)
    session = SimpleNamespace(
        get=AsyncMock(return_value=event),
        commit=AsyncMock(),
    )
    monkeypatch.setattr("services.billing_customer_dispatch.AsyncSessionLocal", lambda: _SessionContext(session))
    monkeypatch.setattr("services.billing_customer_dispatch.now_unix_seconds", lambda: 1_000)

    await _mark_failed("bce_1", 3, "temporary failure")

    assert event.status == "failed"
    assert event.available_at == 1_040
    assert event.last_error == "temporary failure"
    assert event.locked_at is None


async def test_customer_sync_routes_require_admin_key() -> None:
    app = create_app(Settings(internal_key="test-internal-key"))
    app.dependency_overrides[require_api_key] = lambda: True
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/billing/customer-sync/dispatch")

    assert response.status_code == 401
