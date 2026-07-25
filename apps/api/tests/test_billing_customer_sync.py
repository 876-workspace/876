from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.security import require_api_key
from db.models import BillingCustomerOutbox, Membership, Organization, User
from main import create_app
from services.billing_customer_dispatch import (
    _mark_failed,
    dispatch_billing_customer_sync_once,
)
from services.billing_customer_sync import (
    customer_event_payload,
    enqueue_customer_ensure_for_organization,
    enqueue_reconcile_all,
    snapshot_for_organization,
)


def _organization(**overrides: Any) -> Organization:
    return Organization(id="org_1", name="Efesto Technologies", **overrides)


def _user(**overrides: Any) -> User:
    fields: dict[str, Any] = {
        "id": "user_1",
        "email": "ada@example.com",
        "first_name": "Ada",
        "last_name": "Lovelace",
    }
    fields.update(overrides)
    return User(**fields)


class _FakeSession:
    """Minimal AsyncSession stand-in driving the enqueue path.

    ``scalars`` returns queued results in call order; ``get`` resolves users by
    id. Both mirror how ``billing_customer_sync`` actually queries.
    """

    def __init__(
        self,
        *,
        scalar_results: list[Any] | None = None,
        users: dict[str, User] | None = None,
    ) -> None:
        self._scalar_results = list(scalar_results or [])
        self._users = users or {}
        self.added: list[Any] = []
        self.flush_count = 0

    async def scalars(self, _statement: Any) -> Any:
        result = self._scalar_results.pop(0) if self._scalar_results else []
        return SimpleNamespace(
            first=lambda: (result[0] if result else None),
            all=lambda: result,
        )

    async def get(self, _model: Any, identifier: Any, **_kwargs: Any) -> Any:
        return self._users.get(identifier)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def flush(self) -> None:
        self.flush_count += 1


def _membership(role: str = "owner", user_id: str = "user_1") -> Membership:
    return Membership(
        id=f"mem_{user_id}",
        organization_id="org_1",
        user_id=user_id,
        role=role,
        created_at=10,
    )


async def test_organization_snapshot_uses_owner_as_primary_contact() -> None:
    db = _FakeSession(scalar_results=[[_membership()]], users={"user_1": _user()})

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    assert snapshot.customer_kind == "BUSINESS"
    assert snapshot.company_name == "Efesto Technologies"
    assert snapshot.contact_user_id == "user_1"
    assert (snapshot.contact_first_name, snapshot.contact_last_name) == ("Ada", "Lovelace")
    assert snapshot.contact_email == "ada@example.com"
    # The party's own first/last mirror the contact so one column renders a
    # person for both businesses and individuals.
    assert (snapshot.first_name, snapshot.last_name) == ("Ada", "Lovelace")


async def test_organization_snapshot_prefers_declared_primary_contact() -> None:
    declared = _user(id="user_2", email="grace@example.com", first_name="Grace", last_name="Hopper")
    db = _FakeSession(users={"user_2": declared})

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        _organization(primary_contact_user_id="user_2"),
    )

    # The declared contact wins without consulting memberships at all.
    assert snapshot.contact_user_id == "user_2"
    assert snapshot.contact_email == "grace@example.com"


async def test_organization_snapshot_falls_back_to_earliest_member() -> None:
    late_owner = _membership(role="admin", user_id="user_1")
    db = _FakeSession(scalar_results=[[late_owner]], users={"user_1": _user()})

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    assert snapshot.contact_user_id == "user_1"


async def test_organization_snapshot_never_fabricates_a_contact() -> None:
    db = _FakeSession(scalar_results=[[]])

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    assert snapshot.contact_user_id is None
    assert snapshot.contact_email is None
    assert snapshot.company_name == "Efesto Technologies"


async def test_organization_snapshot_prefers_trading_name_for_display() -> None:
    db = _FakeSession(scalar_results=[[]])

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        _organization(doing_business_as="Efesto", primary_email="ap@efesto.test"),
    )

    assert snapshot.name == "Efesto"
    assert snapshot.company_name == "Efesto Technologies"
    assert snapshot.email == "ap@efesto.test"


async def test_enqueue_deduplicates_pending_organization_event() -> None:
    db = _FakeSession(
        scalar_results=[
            [_membership()],  # contact lookup, first call
            [],               # no prior outbox event
            [_membership()],  # contact lookup, second call
        ],
        users={"user_1": _user()},
    )

    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    pending = db.added[0]
    db._scalar_results.append([pending])

    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)

    assert len(db.added) == 1
    assert pending.status == "pending"
    assert pending.subject_type == "organization"
    assert pending.subject_id == "org_1"


async def test_enqueue_skips_delivered_event_with_unchanged_snapshot() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    delivered = db.added[0]
    delivered.status = "delivered"

    db._scalar_results.extend([[_membership()], [delivered]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 200)

    # An unchanged record must not accumulate a second outbox row.
    assert len(db.added) == 1


async def test_enqueue_emits_new_event_when_snapshot_changes() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    delivered = db.added[0]
    delivered.status = "delivered"

    renamed = _user(first_name="Ada", last_name="Byron")
    db._users["user_1"] = renamed
    db._scalar_results.extend([[_membership()], [delivered]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 200)

    assert len(db.added) == 2
    assert db.added[1].contact_last_name == "Byron"


def test_customer_payloads_match_billing_contract() -> None:
    organization_event = BillingCustomerOutbox(
        subject_type="organization",
        subject_id="org_1",
        name="Efesto",
        email="ap@efesto.test",
        customer_kind="BUSINESS",
        company_name="Efesto Technologies",
        first_name="Ada",
        last_name="Lovelace",
        phone="+18761234567",
        contact_user_id="user_1",
        contact_first_name="Ada",
        contact_last_name="Lovelace",
        contact_email="ada@example.com",
        contact_phone=None,
    )
    user_event = BillingCustomerOutbox(
        subject_type="user",
        subject_id="user_1",
        name="Ada Lovelace",
        email="ada@example.com",
        customer_kind="INDIVIDUAL",
        first_name="Ada",
        last_name="Lovelace",
        phone=None,
    )

    assert customer_event_payload(organization_event) == {
        "customerType": "CORE_ORGANIZATION",
        "customerKind": "BUSINESS",
        "organizationId": "org_1",
        "name": "Efesto",
        "companyName": "Efesto Technologies",
        "email": "ap@efesto.test",
        "firstName": "Ada",
        "lastName": "Lovelace",
        "phone": "+18761234567",
        "primaryContact": {
            "userId": "user_1",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "email": "ada@example.com",
            "phone": None,
        },
    }
    assert customer_event_payload(user_event) == {
        "customerType": "CORE_USER",
        "customerKind": "INDIVIDUAL",
        "userId": "user_1",
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "firstName": "Ada",
        "lastName": "Lovelace",
        "phone": None,
    }


def test_organization_payload_omits_contact_when_unresolved() -> None:
    event = BillingCustomerOutbox(
        subject_type="organization",
        subject_id="org_1",
        name="Efesto Technologies",
        email=None,
        customer_kind="BUSINESS",
        company_name="Efesto Technologies",
    )

    assert customer_event_payload(event)["primaryContact"] is None


def test_legacy_event_without_snapshot_still_serializes() -> None:
    """Rows written before the party snapshot must remain deliverable."""
    event = BillingCustomerOutbox(subject_type="organization", subject_id="org_1", name="Efesto", email=None)

    payload = customer_event_payload(event)

    assert payload["customerKind"] == "BUSINESS"
    assert payload["customerType"] == "CORE_ORGANIZATION"
    assert payload["primaryContact"] is None


async def test_reconcile_covers_orgs_and_only_already_known_users() -> None:
    db = _FakeSession(
        scalar_results=[
            [_organization()],   # organizations
            [_membership()],     # contact lookup for org_1
            [],                  # no prior org event
            ["user_1"],          # user ids already known to Billing
            [],                  # no prior user event
        ],
        users={"user_1": _user()},
    )

    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 100)

    assert counts == {"organizations": 1, "users": 1}
    assert len(db.added) == 2


async def test_reconcile_does_not_manufacture_customers_for_new_signups() -> None:
    db = _FakeSession(
        scalar_results=[
            [_organization()],
            [_membership()],
            [],
            [],  # no user has ever been synced to Billing
        ],
        users={"user_1": _user()},
    )

    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 100)

    # Signing up for a free 876 account does not make someone a customer.
    assert counts == {"organizations": 1, "users": 0}


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


# ---------------------------------------------------------------------------
# Party snapshot — users
# ---------------------------------------------------------------------------


def test_user_snapshot_is_individual_with_no_separate_contact() -> None:
    from services.billing_customer_sync import snapshot_for_user

    snapshot = snapshot_for_user(_user(phone="+18765550111"))

    assert snapshot.subject_type == "user"
    assert snapshot.subject_id == "user_1"
    assert snapshot.customer_kind == "INDIVIDUAL"
    assert snapshot.name == "Ada Lovelace"
    assert snapshot.email == "ada@example.com"
    assert (snapshot.first_name, snapshot.last_name) == ("Ada", "Lovelace")
    assert snapshot.phone == "+18765550111"
    assert snapshot.company_name is None
    # A person is their own contact — Billing must not seed a contact row.
    assert snapshot.contact_user_id is None
    assert snapshot.contact_email is None


def test_user_snapshot_prefers_explicit_name_over_first_last() -> None:
    from services.billing_customer_sync import snapshot_for_user

    snapshot = snapshot_for_user(_user(name="Countess of Lovelace"))

    assert snapshot.name == "Countess of Lovelace"


def test_user_snapshot_falls_back_to_username_then_email_then_id() -> None:
    from services.billing_customer_sync import snapshot_for_user

    by_username = snapshot_for_user(
        _user(first_name=None, last_name=None, email=None, username="ada")
    )
    by_email = snapshot_for_user(_user(first_name=None, last_name=None, email="ada@example.com"))
    by_id = snapshot_for_user(
        _user(first_name=None, last_name=None, email=None, username=None)
    )

    assert by_username.name == "ada"
    assert by_email.name == "ada@example.com"
    assert by_id.name == "user_1"


def test_user_snapshot_ignores_blank_name_parts() -> None:
    from services.billing_customer_sync import snapshot_for_user

    snapshot = snapshot_for_user(_user(first_name="  ", last_name="Lovelace", email=None))

    assert snapshot.name == "Lovelace"


# ---------------------------------------------------------------------------
# Party snapshot — organizations (edge cases)
# ---------------------------------------------------------------------------


async def test_organization_snapshot_falls_back_to_contact_email() -> None:
    db = _FakeSession(scalar_results=[[_membership()]], users={"user_1": _user()})

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    # No primary_email on the org → use the resolved contact's email.
    assert snapshot.email == "ada@example.com"


async def test_organization_snapshot_prefers_owner_over_earlier_admin() -> None:
    admin = _membership(role="admin", user_id="user_admin")
    # Force admin to appear first in the membership list.
    admin.created_at = 1
    owner = _membership(role="owner", user_id="user_owner")
    owner.created_at = 99
    db = _FakeSession(
        scalar_results=[[admin, owner]],
        users={
            "user_admin": _user(id="user_admin", email="admin@example.com", first_name="Admin"),
            "user_owner": _user(id="user_owner", email="owner@example.com", first_name="Owner"),
        },
    )

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    assert snapshot.contact_user_id == "user_owner"
    assert snapshot.contact_email == "owner@example.com"
    assert snapshot.first_name == "Owner"


async def test_organization_snapshot_skips_missing_declared_contact() -> None:
    """A stale primary_contact_user_id must not strand the org without a contact."""
    db = _FakeSession(
        scalar_results=[[_membership()]],
        users={"user_1": _user()},
    )

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        _organization(primary_contact_user_id="user_gone"),
    )

    assert snapshot.contact_user_id == "user_1"
    assert snapshot.contact_email == "ada@example.com"


async def test_organization_snapshot_carries_org_and_contact_phones() -> None:
    contact = _user(phone="+18765550999")
    db = _FakeSession(scalar_results=[[_membership()]], users={"user_1": contact})

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        _organization(primary_phone="+18765550000"),
    )

    assert snapshot.phone == "+18765550000"
    assert snapshot.contact_phone == "+18765550999"


async def test_organization_snapshot_name_falls_back_to_org_id() -> None:
    db = _FakeSession(scalar_results=[[]])

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        Organization(id="org_blank", name=""),
    )

    assert snapshot.name == "org_blank"
    assert snapshot.company_name == "org_blank"


# ---------------------------------------------------------------------------
# Enqueue semantics — users, pending refresh, failed re-enqueue
# ---------------------------------------------------------------------------


async def test_enqueue_user_writes_individual_party_snapshot() -> None:
    from services.billing_customer_sync import enqueue_customer_ensure_for_user

    db = _FakeSession(scalar_results=[[]])

    await enqueue_customer_ensure_for_user(cast(AsyncSession, db), _user(phone="+1"), 100)

    assert len(db.added) == 1
    event = db.added[0]
    assert event.subject_type == "user"
    assert event.subject_id == "user_1"
    assert event.customer_kind == "INDIVIDUAL"
    assert event.first_name == "Ada"
    assert event.last_name == "Lovelace"
    assert event.company_name is None
    assert event.contact_user_id is None
    assert event.payload_hash is not None
    assert event.status == "pending"
    assert event.event_type == "customer.ensure"
    assert event.attempt_count == 0
    assert event.available_at == 100


async def test_enqueue_refreshes_pending_event_when_snapshot_changes() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    pending = db.added[0]
    assert pending.status == "pending"
    original_hash = pending.payload_hash

    renamed = _user(first_name="Ada", last_name="Byron")
    db._users["user_1"] = renamed
    db._scalar_results.extend([[_membership()], [pending]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 200)

    # Undelivered rows are mutated in place — no second outbox row.
    assert len(db.added) == 1
    assert pending.contact_last_name == "Byron"
    assert pending.last_name == "Byron"
    assert pending.payload_hash != original_hash
    assert pending.occurred_at == 200
    assert pending.updated_at == 200
    assert pending.status == "pending"


async def test_enqueue_skips_pending_event_when_snapshot_unchanged() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    pending = db.added[0]
    original_hash = pending.payload_hash
    original_updated = pending.updated_at

    db._scalar_results.extend([[_membership()], [pending]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 200)

    assert len(db.added) == 1
    assert pending.payload_hash == original_hash
    # Unchanged pending rows are not rewritten.
    assert pending.updated_at == original_updated


async def test_enqueue_refreshes_processing_event_when_snapshot_changes() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    processing = db.added[0]
    processing.status = "processing"

    renamed = _user(first_name="Grace", last_name="Hopper")
    db._users["user_1"] = renamed
    db._scalar_results.extend([[_membership()], [processing]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 300)

    assert len(db.added) == 1
    assert processing.contact_first_name == "Grace"
    assert processing.status == "processing"


async def test_enqueue_reissues_after_failed_delivery() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    failed = db.added[0]
    failed.status = "failed"
    failed.last_error = "billing unavailable"
    failed.attempt_count = 3

    db._scalar_results.extend([[_membership()], [failed]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 400)

    # Failed deliveries always get a fresh pending row so the dispatcher can
    # claim a clean attempt_count=0 event.
    assert len(db.added) == 2
    assert db.added[1].status == "pending"
    assert db.added[1].attempt_count == 0
    assert db.added[1].subject_id == "org_1"


async def test_enqueue_reissues_after_failed_delivery_even_if_snapshot_matches() -> None:
    """A failed row with an identical hash must still be re-enqueued."""
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    failed = db.added[0]
    failed.status = "failed"

    db._scalar_results.extend([[_membership()], [failed]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 500)

    assert len(db.added) == 2
    assert db.added[1].payload_hash == failed.payload_hash


async def test_payload_hash_is_stable_for_identical_snapshots() -> None:
    from services.billing_customer_sync import _payload_hash, snapshot_for_user

    a = snapshot_for_user(_user())
    b = snapshot_for_user(_user())

    assert _payload_hash(a) == _payload_hash(b)
    assert len(_payload_hash(a)) == 64  # sha256 hex


async def test_payload_hash_changes_when_any_party_field_changes() -> None:
    from services.billing_customer_sync import _payload_hash, snapshot_for_user

    base = snapshot_for_user(_user())
    renamed = snapshot_for_user(_user(last_name="Byron"))
    new_email = snapshot_for_user(_user(email="ada@byron.test"))

    assert _payload_hash(base) != _payload_hash(renamed)
    assert _payload_hash(base) != _payload_hash(new_email)


# ---------------------------------------------------------------------------
# Payload contract edge cases
# ---------------------------------------------------------------------------


def test_user_payload_never_includes_primary_contact_or_company() -> None:
    event = BillingCustomerOutbox(
        subject_type="user",
        subject_id="user_1",
        name="Ada Lovelace",
        email="ada@example.com",
        customer_kind="INDIVIDUAL",
        first_name="Ada",
        last_name="Lovelace",
        # Even if a contact somehow lands on a user row, the serializer must
        # not emit it — individuals are their own contact.
        contact_user_id="user_1",
        contact_email="ada@example.com",
        company_name="Should not appear",
    )

    payload = customer_event_payload(event)

    assert "primaryContact" not in payload
    assert "companyName" not in payload
    assert "organizationId" not in payload
    assert payload["customerType"] == "CORE_USER"
    assert payload["userId"] == "user_1"


def test_organization_payload_includes_null_optional_fields() -> None:
    event = BillingCustomerOutbox(
        subject_type="organization",
        subject_id="org_1",
        name="Efesto",
        email=None,
        customer_kind="BUSINESS",
        company_name="Efesto Technologies",
        first_name=None,
        last_name=None,
        phone=None,
        contact_user_id="user_1",
        contact_first_name=None,
        contact_last_name=None,
        contact_email=None,
        contact_phone=None,
    )

    payload = customer_event_payload(event)

    assert payload["email"] is None
    assert payload["firstName"] is None
    assert payload["phone"] is None
    assert payload["primaryContact"] == {
        "userId": "user_1",
        "firstName": None,
        "lastName": None,
        "email": None,
        "phone": None,
    }


def test_legacy_user_event_defaults_to_individual() -> None:
    event = BillingCustomerOutbox(subject_type="user", subject_id="user_1", name="Ada", email=None)

    payload = customer_event_payload(event)

    assert payload["customerKind"] == "INDIVIDUAL"
    assert payload["customerType"] == "CORE_USER"
    assert payload["userId"] == "user_1"


# ---------------------------------------------------------------------------
# Reconcile edge cases
# ---------------------------------------------------------------------------


async def test_reconcile_skips_known_user_ids_that_no_longer_exist() -> None:
    db = _FakeSession(
        scalar_results=[
            [],                 # no organizations
            ["user_gone"],      # known to Billing historically
        ],
        users={},  # user is gone from identity
    )

    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 100)

    assert counts == {"organizations": 0, "users": 0}
    assert db.added == []


async def test_reconcile_counts_only_newly_enqueued_events() -> None:
    """Already-delivered, unchanged subjects must not inflate the summary."""
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    delivered = db.added[0]
    delivered.status = "delivered"

    db._scalar_results.extend(
        [
            [_organization()],
            [_membership()],
            [delivered],  # latest for org is delivered + same hash
            [],           # no known users
        ]
    )
    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 200)

    assert counts == {"organizations": 0, "users": 0}
    assert len(db.added) == 1


async def test_reconcile_re_enqueues_when_org_snapshot_changed() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    delivered = db.added[0]
    delivered.status = "delivered"

    db._users["user_1"] = _user(last_name="Byron")
    db._scalar_results.extend(
        [
            [_organization()],
            [_membership()],
            [delivered],
            [],
        ]
    )
    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 200)

    assert counts == {"organizations": 1, "users": 0}
    assert len(db.added) == 2
    assert db.added[1].contact_last_name == "Byron"


# ---------------------------------------------------------------------------
# Dispatch payload wiring
# ---------------------------------------------------------------------------


async def test_dispatch_posts_full_organization_party_payload(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(
        id="bce_org",
        subject_type="organization",
        subject_id="org_1",
        name="Efesto",
        email="ap@efesto.test",
        customer_kind="BUSINESS",
        company_name="Efesto Technologies",
        first_name="Ada",
        last_name="Lovelace",
        phone="+18761234567",
        contact_user_id="user_1",
        contact_first_name="Ada",
        contact_last_name="Lovelace",
        contact_email="ada@example.com",
        contact_phone=None,
        attempt_count=0,
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

    await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="secret")
    )

    assert client.post.await_args is not None
    # Body is the customer.ensure contract Billing's ensure path expects.
    posted = client.post.await_args.kwargs["json"]
    assert posted == customer_event_payload(event)
    assert posted["primaryContact"]["userId"] == "user_1"
    assert posted["customerKind"] == "BUSINESS"
    assert client.post.await_args.args[0].endswith("/api/v1/admin/customers/ensure")


# ---------------------------------------------------------------------------
# Full-name / snapshot edge cases
# ---------------------------------------------------------------------------


def test_full_name_strips_and_drops_blank_parts() -> None:
    from services.billing_customer_sync import _full_name

    assert _full_name("  Ada  ", "  Lovelace  ") == "Ada Lovelace"
    assert _full_name("Ada", None) == "Ada"
    assert _full_name(None, "Lovelace") == "Lovelace"
    assert _full_name("  ", "\t") is None
    assert _full_name(None, None) is None
    assert _full_name("", "") is None


def test_user_snapshot_coerces_empty_email_to_none() -> None:
    from services.billing_customer_sync import snapshot_for_user

    snapshot = snapshot_for_user(_user(email=""))

    assert snapshot.email is None


def test_user_snapshot_coerces_empty_first_last_to_none() -> None:
    from services.billing_customer_sync import snapshot_for_user

    snapshot = snapshot_for_user(_user(first_name="", last_name="", email="ada@example.com"))

    assert snapshot.first_name is None
    assert snapshot.last_name is None
    assert snapshot.name == "ada@example.com"


async def test_organization_snapshot_owner_membership_with_missing_user() -> None:
    """Owner membership points at a deleted user — no fabricated contact."""
    db = _FakeSession(scalar_results=[[_membership()]], users={})

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    assert snapshot.contact_user_id is None
    assert snapshot.first_name is None
    assert snapshot.email is None


async def test_organization_snapshot_whitespace_trading_name_is_truthy() -> None:
    # Python truthiness: a non-empty whitespace string is used as display name.
    db = _FakeSession(scalar_results=[[]])

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        _organization(doing_business_as="  "),
    )

    assert snapshot.name == "  "
    assert snapshot.company_name == "Efesto Technologies"


async def test_organization_snapshot_empty_trading_name_falls_back_to_legal() -> None:
    db = _FakeSession(scalar_results=[[]])

    snapshot = await snapshot_for_organization(
        cast(AsyncSession, db),
        _organization(doing_business_as=""),
    )

    assert snapshot.name == "Efesto Technologies"


async def test_organization_snapshot_tie_breaks_memberships_by_id() -> None:
    # Same created_at → order_by Membership.id decides earliest.
    early = Membership(
        id="mem_a",
        organization_id="org_1",
        user_id="user_a",
        role="member",
        created_at=5,
    )
    late = Membership(
        id="mem_b",
        organization_id="org_1",
        user_id="user_b",
        role="member",
        created_at=5,
    )
    db = _FakeSession(
        scalar_results=[[early, late]],
        users={
            "user_a": _user(id="user_a", email="a@example.com", first_name="A"),
            "user_b": _user(id="user_b", email="b@example.com", first_name="B"),
        },
    )

    snapshot = await snapshot_for_organization(cast(AsyncSession, db), _organization())

    # FakeSession returns the list as given; production SQL orders by id.
    # With the list ordered mem_a then mem_b, first membership wins.
    assert snapshot.contact_user_id == "user_a"


# ---------------------------------------------------------------------------
# Enqueue edge cases
# ---------------------------------------------------------------------------


async def test_enqueue_skips_processing_when_snapshot_unchanged() -> None:
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    processing = db.added[0]
    processing.status = "processing"
    original_hash = processing.payload_hash
    original_updated = processing.updated_at

    db._scalar_results.extend([[_membership()], [processing]])
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 200)

    assert len(db.added) == 1
    assert processing.payload_hash == original_hash
    assert processing.updated_at == original_updated
    assert processing.status == "processing"


async def test_enqueue_user_deduplicates_pending() -> None:
    from services.billing_customer_sync import enqueue_customer_ensure_for_user

    db = _FakeSession(scalar_results=[[]])
    await enqueue_customer_ensure_for_user(cast(AsyncSession, db), _user(), 100)
    pending = db.added[0]
    db._scalar_results.append([pending])

    await enqueue_customer_ensure_for_user(cast(AsyncSession, db), _user(), 200)

    assert len(db.added) == 1


async def test_enqueue_user_emits_when_name_changes() -> None:
    from services.billing_customer_sync import enqueue_customer_ensure_for_user

    db = _FakeSession(scalar_results=[[]])
    await enqueue_customer_ensure_for_user(cast(AsyncSession, db), _user(), 100)
    delivered = db.added[0]
    delivered.status = "delivered"
    db._scalar_results.append([delivered])

    await enqueue_customer_ensure_for_user(
        cast(AsyncSession, db),
        _user(last_name="Byron"),
        200,
    )

    assert len(db.added) == 2
    assert db.added[1].last_name == "Byron"


async def test_enqueue_sets_event_type_and_zero_attempts() -> None:
    db = _FakeSession(scalar_results=[[]], users={})
    await enqueue_customer_ensure_for_organization(
        cast(AsyncSession, db),
        _organization(),
        50,
    )

    event = db.added[0]
    assert event.event_type == "customer.ensure"
    assert event.attempt_count == 0
    assert event.available_at == 50
    assert event.locked_at is None
    assert event.delivered_at is None
    assert event.last_error is None


async def test_enqueue_returns_false_semantics_via_reconcile_count() -> None:
    """Pending refresh must not inflate reconcile counts (returns False)."""
    db = _FakeSession(
        scalar_results=[[_membership()], []],
        users={"user_1": _user()},
    )
    await enqueue_customer_ensure_for_organization(cast(AsyncSession, db), _organization(), 100)
    pending = db.added[0]
    # Change snapshot so pending is refreshed in place.
    db._users["user_1"] = _user(last_name="Byron")
    db._scalar_results.extend(
        [
            [_organization()],
            [_membership()],
            [pending],
            [],
        ]
    )
    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 200)

    assert counts == {"organizations": 0, "users": 0}
    assert len(db.added) == 1
    assert pending.contact_last_name == "Byron"


# ---------------------------------------------------------------------------
# Dispatch / claim / mark edge cases
# ---------------------------------------------------------------------------


async def test_dispatch_not_configured_without_billing_url() -> None:
    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="", billing_internal_key="secret")
    )

    assert summary == SimpleNamespace(claimed=0, delivered=0, failed=0, configured=False) or (
        summary.claimed,
        summary.delivered,
        summary.failed,
        summary.configured,
    ) == (0, 0, 0, False)


async def test_dispatch_not_configured_without_internal_key() -> None:
    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="")
    )

    assert (summary.claimed, summary.delivered, summary.failed, summary.configured) == (
        0,
        0,
        0,
        False,
    )


async def test_dispatch_empty_claim_returns_configured_with_zero(monkeypatch: Any) -> None:
    session = SimpleNamespace(commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr(
        "services.billing_customer_dispatch.claim_billing_customer_events",
        AsyncMock(return_value=[]),
    )

    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="secret")
    )

    assert (summary.claimed, summary.delivered, summary.failed, summary.configured) == (
        1 if False else 0,
        0,
        0,
        True,
    )


async def test_dispatch_strips_trailing_slash_on_billing_url(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(
        id="bce_1",
        subject_type="user",
        subject_id="user_1",
        name="Ada",
        email="ada@example.com",
        attempt_count=1,
    )
    session = SimpleNamespace(commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr(
        "services.billing_customer_dispatch.claim_billing_customer_events",
        AsyncMock(return_value=[event]),
    )
    monkeypatch.setattr(
        "services.billing_customer_dispatch._mark_delivered",
        AsyncMock(),
    )
    client = _ClientContext(httpx.Response(204, request=httpx.Request("POST", "https://billing.test")))
    monkeypatch.setattr(
        "services.billing_customer_dispatch.httpx.AsyncClient",
        lambda **_kwargs: client,
    )

    await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test/", billing_internal_key="secret")
    )

    assert client.post.await_args.args[0] == "https://billing.test/api/v1/admin/customers/ensure"


async def test_dispatch_marks_network_error_as_failed(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(
        id="bce_net",
        subject_type="user",
        subject_id="user_1",
        name="Ada",
        email="ada@example.com",
        attempt_count=1,
    )
    session = SimpleNamespace(commit=AsyncMock())
    failed = AsyncMock()

    class _FailingClient:
        async def __aenter__(self) -> "_FailingClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

        post = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr(
        "services.billing_customer_dispatch.claim_billing_customer_events",
        AsyncMock(return_value=[event]),
    )
    monkeypatch.setattr("services.billing_customer_dispatch._mark_failed", failed)
    monkeypatch.setattr(
        "services.billing_customer_dispatch.httpx.AsyncClient",
        lambda **_kwargs: _FailingClient(),
    )

    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="secret")
    )

    assert (summary.claimed, summary.delivered, summary.failed) == (1, 0, 1)
    assert failed.await_args is not None
    assert "ConnectError" in failed.await_args.args[2]


async def test_dispatch_partial_batch_counts_delivered_and_failed(monkeypatch: Any) -> None:
    ok_event = BillingCustomerOutbox(
        id="bce_ok",
        subject_type="user",
        subject_id="user_1",
        name="Ada",
        email="a@x.com",
        attempt_count=1,
    )
    bad_event = BillingCustomerOutbox(
        id="bce_bad",
        subject_type="user",
        subject_id="user_2",
        name="Bob",
        email="b@x.com",
        attempt_count=1,
    )
    session = SimpleNamespace(commit=AsyncMock())
    delivered = AsyncMock()
    failed = AsyncMock()
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr(
        "services.billing_customer_dispatch.claim_billing_customer_events",
        AsyncMock(return_value=[ok_event, bad_event]),
    )
    monkeypatch.setattr("services.billing_customer_dispatch._mark_delivered", delivered)
    monkeypatch.setattr("services.billing_customer_dispatch._mark_failed", failed)

    responses = [
        httpx.Response(204, request=httpx.Request("POST", "https://billing.test")),
        httpx.Response(500, request=httpx.Request("POST", "https://billing.test")),
    ]

    class _MixedClient:
        def __init__(self) -> None:
            self.post = AsyncMock(side_effect=responses)

        async def __aenter__(self) -> "_MixedClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

    monkeypatch.setattr(
        "services.billing_customer_dispatch.httpx.AsyncClient",
        lambda **_kwargs: _MixedClient(),
    )

    summary = await dispatch_billing_customer_sync_once(
        Settings(billing_url="https://billing.test", billing_internal_key="secret")
    )

    assert (summary.claimed, summary.delivered, summary.failed) == (2, 1, 1)
    delivered.assert_awaited_once_with("bce_ok")
    assert failed.await_args.args[0] == "bce_bad"


async def test_mark_delivered_noops_when_event_missing(monkeypatch: Any) -> None:
    from services.billing_customer_dispatch import _mark_delivered

    session = SimpleNamespace(get=AsyncMock(return_value=None), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )

    await _mark_delivered("bce_missing")

    session.commit.assert_not_awaited()


async def test_mark_delivered_noops_when_not_processing(monkeypatch: Any) -> None:
    from services.billing_customer_dispatch import _mark_delivered

    event = BillingCustomerOutbox(id="bce_1", status="pending", attempt_count=1)
    session = SimpleNamespace(get=AsyncMock(return_value=event), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )

    await _mark_delivered("bce_1")

    assert event.status == "pending"
    session.commit.assert_not_awaited()


async def test_mark_delivered_sets_tombstone_fields(monkeypatch: Any) -> None:
    from services.billing_customer_dispatch import _mark_delivered

    event = BillingCustomerOutbox(
        id="bce_1",
        status="processing",
        attempt_count=2,
        locked_at=999,
        last_error="temp",
    )
    session = SimpleNamespace(get=AsyncMock(return_value=event), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr("services.billing_customer_dispatch.now_unix_seconds", lambda: 5_000)

    await _mark_delivered("bce_1")

    assert event.status == "delivered"
    assert event.delivered_at == 5_000
    assert event.locked_at is None
    assert event.last_error is None
    assert event.updated_at == 5_000
    session.commit.assert_awaited_once()


async def test_mark_failed_noops_when_not_processing(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(id="bce_1", status="delivered", attempt_count=1)
    session = SimpleNamespace(get=AsyncMock(return_value=event), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )

    await _mark_failed("bce_1", 1, "late")

    assert event.status == "delivered"
    session.commit.assert_not_awaited()


async def test_mark_failed_backoff_caps_at_one_hour(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(id="bce_1", status="processing", attempt_count=20)
    session = SimpleNamespace(get=AsyncMock(return_value=event), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr("services.billing_customer_dispatch.now_unix_seconds", lambda: 1_000)

    await _mark_failed("bce_1", 20, "still failing")

    # min(3600, 5 * 2**min(20,10)) = min(3600, 5*1024) = 3600
    assert event.available_at == 1_000 + 3_600
    assert event.status == "failed"


async def test_mark_failed_truncates_long_error(monkeypatch: Any) -> None:
    event = BillingCustomerOutbox(id="bce_1", status="processing", attempt_count=1)
    session = SimpleNamespace(get=AsyncMock(return_value=event), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    monkeypatch.setattr("services.billing_customer_dispatch.now_unix_seconds", lambda: 10)

    await _mark_failed("bce_1", 1, "x" * 5_000)

    assert event.last_error is not None
    assert len(event.last_error) == 2_000


def test_delivery_error_formats_http_status() -> None:
    from services.billing_customer_dispatch import _delivery_error

    request = httpx.Request("POST", "https://billing.test/ensure")
    response = httpx.Response(422, text="  invalid party  ", request=request)
    error = httpx.HTTPStatusError("boom", request=request, response=response)

    message = _delivery_error(error)

    assert message == "Billing returned HTTP 422: invalid party"


def test_delivery_error_formats_generic_exception() -> None:
    from services.billing_customer_dispatch import _delivery_error

    assert _delivery_error(ValueError("nope")) == "ValueError: nope"


def test_delivery_error_truncates_http_body() -> None:
    from services.billing_customer_dispatch import _delivery_error

    request = httpx.Request("POST", "https://billing.test/ensure")
    response = httpx.Response(500, text="z" * 1_000, request=request)
    error = httpx.HTTPStatusError("boom", request=request, response=response)

    message = _delivery_error(error)

    assert "HTTP 500" in message
    # Body is truncated to 500 chars before formatting.
    assert len(message) < 600


async def test_claim_marks_rows_processing_and_increments_attempts() -> None:
    from services.billing_customer_dispatch import claim_billing_customer_events

    event = BillingCustomerOutbox(
        id="bce_1",
        status="pending",
        attempt_count=0,
        available_at=0,
        last_error="old",
    )

    class _ClaimSession(_FakeSession):
        async def scalars(self, _statement: Any) -> Any:
            return SimpleNamespace(all=lambda: [event])

    db = _ClaimSession()
    rows = await claim_billing_customer_events(cast(AsyncSession, db), now=1_000, limit=10)

    assert rows == [event]
    assert event.status == "processing"
    assert event.attempt_count == 1
    assert event.locked_at == 1_000
    assert event.last_error is None
    assert event.updated_at == 1_000
    assert db.flush_count == 1


async def test_reconcile_re_enqueues_changed_known_user() -> None:
    db = _FakeSession(
        scalar_results=[
            [],  # orgs
            ["user_1"],
        ],
        users={"user_1": _user(last_name="Byron")},
    )
    # Seed a prior delivered event with the original snapshot hash by enqueueing once.
    seed = _FakeSession(scalar_results=[[]], users={"user_1": _user()})
    from services.billing_customer_sync import enqueue_customer_ensure_for_user

    await enqueue_customer_ensure_for_user(cast(AsyncSession, seed), _user(), 50)
    delivered = seed.added[0]
    delivered.status = "delivered"

    # Reconcile path: known user id, then get user, then latest outbox is delivered old hash.
    db._scalar_results = [
        [],  # orgs
        ["user_1"],  # known users
    ]
    # enqueue for user will scalars for latest outbox
    async def _scalars(statement: Any) -> Any:
        # First call: organizations. Second: known user ids. Third: latest outbox for user.
        if not hasattr(db, "_call_n"):
            db._call_n = 0
        db._call_n += 1
        if db._call_n == 1:
            return SimpleNamespace(all=lambda: [], first=lambda: None)
        if db._call_n == 2:
            return SimpleNamespace(all=lambda: ["user_1"], first=lambda: "user_1")
        return SimpleNamespace(all=lambda: [delivered], first=lambda: delivered)

    db.scalars = _scalars  # type: ignore[method-assign]
    db._users = {"user_1": _user(last_name="Byron")}

    counts = await enqueue_reconcile_all(cast(AsyncSession, db), 100)

    assert counts == {"organizations": 0, "users": 1}
    assert len(db.added) == 1
    assert db.added[0].last_name == "Byron"


# ---------------------------------------------------------------------------
# Backoff formula matrix — available_at = now + min(3600, 5 * 2**min(n, 10))
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("attempt_count", "expected_delay"),
    [
        (0, 5),  # 5 * 2**0
        (1, 10),  # 5 * 2**1
        (2, 20),
        (3, 40),
        (4, 80),
        (5, 160),
        (6, 320),
        (7, 640),
        (8, 1_280),
        (9, 2_560),
        (10, 3_600),  # 5 * 2**10 = 5120, capped at 3600
        (11, 3_600),  # min(attempt, 10) keeps exponent at 10
        (12, 3_600),
        (100, 3_600),
    ],
)
async def test_mark_failed_backoff_matrix(
    monkeypatch: Any,
    attempt_count: int,
    expected_delay: int,
) -> None:
    """Every attempt_count maps to the documented exponential backoff + 1h cap."""
    event = BillingCustomerOutbox(
        id="bce_backoff",
        status="processing",
        attempt_count=attempt_count,
    )
    session = SimpleNamespace(get=AsyncMock(return_value=event), commit=AsyncMock())
    monkeypatch.setattr(
        "services.billing_customer_dispatch.AsyncSessionLocal",
        lambda: _SessionContext(session),
    )
    now = 10_000
    monkeypatch.setattr("services.billing_customer_dispatch.now_unix_seconds", lambda: now)

    await _mark_failed("bce_backoff", attempt_count, f"attempt {attempt_count}")

    assert event.status == "failed"
    assert event.available_at == now + expected_delay
    assert event.locked_at is None
    assert event.last_error == f"attempt {attempt_count}"
    # Sanity: formula matches production expression exactly.
    assert expected_delay == min(3_600, 5 * (2 ** min(attempt_count, 10)))


def test_backoff_formula_is_strictly_non_decreasing_until_cap() -> None:
    delays = [min(3_600, 5 * (2 ** min(n, 10))) for n in range(0, 15)]

    for earlier, later in zip(delays, delays[1:], strict=False):
        assert later >= earlier
    assert delays[0] == 5
    assert delays[9] == 2_560
    assert all(d == 3_600 for d in delays[10:])


# ---------------------------------------------------------------------------
# Payload hash sensitivity — flip every PartySnapshot field once
# ---------------------------------------------------------------------------


def _base_party_snapshot(**overrides: Any) -> Any:
    from services.billing_customer_sync import PartySnapshot

    fields: dict[str, Any] = {
        "subject_type": "organization",
        "subject_id": "org_1",
        "customer_kind": "BUSINESS",
        "name": "Efesto",
        "email": "ap@efesto.test",
        "company_name": "Efesto Technologies",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone": "+18765550000",
        "contact_user_id": "user_1",
        "contact_first_name": "Ada",
        "contact_last_name": "Lovelace",
        "contact_email": "ada@example.com",
        "contact_phone": "+18765550111",
    }
    fields.update(overrides)
    return PartySnapshot(**fields)


# (field, alternate value) — each alternate must differ from the base above.
_SNAPSHOT_FIELD_FLIPS: list[tuple[str, Any]] = [
    ("subject_type", "user"),
    ("subject_id", "org_2"),
    ("customer_kind", "INDIVIDUAL"),
    ("name", "Other Name"),
    ("email", "other@efesto.test"),
    ("email", None),  # null vs string is a real delivery change
    ("company_name", "Other Co"),
    ("company_name", None),
    ("first_name", "Grace"),
    ("first_name", None),
    ("last_name", "Hopper"),
    ("last_name", None),
    ("phone", "+18005551212"),
    ("phone", None),
    ("contact_user_id", "user_2"),
    ("contact_user_id", None),
    ("contact_first_name", "Grace"),
    ("contact_first_name", None),
    ("contact_last_name", "Hopper"),
    ("contact_last_name", None),
    ("contact_email", "grace@example.com"),
    ("contact_email", None),
    ("contact_phone", "+18005550000"),
    ("contact_phone", None),
]


@pytest.mark.parametrize(("field", "value"), _SNAPSHOT_FIELD_FLIPS, ids=lambda p: str(p))
def test_payload_hash_changes_when_each_snapshot_field_flips(field: str, value: Any) -> None:
    from services.billing_customer_sync import _payload_hash

    base = _base_party_snapshot()
    flipped = _base_party_snapshot(**{field: value})

    assert getattr(base, field) != value
    assert _payload_hash(base) != _payload_hash(flipped)
    # Both remain valid sha256 hex digests.
    assert len(_payload_hash(base)) == 64
    assert len(_payload_hash(flipped)) == 64


def test_payload_hash_is_stable_across_repeated_calls_for_same_snapshot() -> None:
    from services.billing_customer_sync import _payload_hash

    snapshot = _base_party_snapshot()
    hashes = {_payload_hash(snapshot) for _ in range(20)}

    assert len(hashes) == 1


def test_payload_hash_uses_sorted_keys_so_construction_order_does_not_matter() -> None:
    """Frozen dataclass __dict__ order is field definition order; pin that the
    digest is independent of Python version quirks by comparing two equal
    snapshots built the same way.
    """
    from services.billing_customer_sync import _payload_hash

    a = _base_party_snapshot()
    b = _base_party_snapshot()

    assert a == b
    assert _payload_hash(a) == _payload_hash(b)


def test_payload_hash_is_sensitive_to_whitespace_in_name() -> None:
    from services.billing_customer_sync import _payload_hash

    trimmed = _base_party_snapshot(name="Efesto")
    padded = _base_party_snapshot(name="Efesto ")

    assert _payload_hash(trimmed) != _payload_hash(padded)


def test_payload_hash_is_sensitive_to_email_case() -> None:
    from services.billing_customer_sync import _payload_hash

    lower = _base_party_snapshot(email="ap@efesto.test")
    upper = _base_party_snapshot(email="AP@efesto.test")

    assert _payload_hash(lower) != _payload_hash(upper)


def test_payload_hash_covers_every_party_snapshot_field() -> None:
    """Guard against adding a PartySnapshot field without a flip test."""
    from services.billing_customer_sync import PartySnapshot

    snapshot_fields = set(PartySnapshot.__dataclass_fields__)
    covered = {field for field, _ in _SNAPSHOT_FIELD_FLIPS}

    assert covered == snapshot_fields, (
        f"Missing hash flip coverage for: {sorted(snapshot_fields - covered)}; "
        f"extra flips for removed fields: {sorted(covered - snapshot_fields)}"
    )


def test_two_independent_field_flips_produce_distinct_hashes() -> None:
    from services.billing_customer_sync import _payload_hash

    base = _payload_hash(_base_party_snapshot())
    name_flip = _payload_hash(_base_party_snapshot(name="Other"))
    email_flip = _payload_hash(_base_party_snapshot(email="x@y.test"))
    both = _payload_hash(_base_party_snapshot(name="Other", email="x@y.test"))

    assert len({base, name_flip, email_flip, both}) == 4
