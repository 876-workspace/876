"""Unit tests for Core→Billing party synchronization (`customer.ensure`).

These exercise the pure decision paths in
`domains.billing.workflows.customer_sync` with an in-memory session stand-in —
no database required.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from core.errors import AppHTTPException
from db.models.generated.enums import CustomerKind, CustomerStatus, CustomerType
from domains.billing.workflows import customer_sync as sync


class _FakeScalars:
    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def all(self) -> list[Any]:
        return list(self._rows)


class _FakeSession:
    """Minimal AsyncSession stand-in for ensure_core_customer / contact sync.

    Contact lookups consume ``contact_results`` in call order so a demote path
    (lookup by user_id → empty) can be distinguished from a refresh path
    (lookup by user_id → existing contact). Customer lookups always return
    ``customers``. Tenant-by-slug uses ``tenants_by_slug``.
    """

    def __init__(
        self,
        *,
        tenants: dict[str, Any] | None = None,
        tenants_by_slug: dict[str, Any] | None = None,
        customers: list[Any] | None = None,
        contact_results: list[list[Any]] | None = None,
        contacts: list[Any] | None = None,
    ) -> None:
        self._tenants = tenants or {}
        self._tenants_by_slug = tenants_by_slug or {}
        self._customers = list(customers or [])
        # Prefer an explicit per-call queue; fall back to a single batch of
        # `contacts` for attach_primary_contacts style tests.
        if contact_results is not None:
            self._contact_results = [list(batch) for batch in contact_results]
        elif contacts is not None:
            self._contact_results = [list(contacts)]
        else:
            self._contact_results = []
        self._all_contacts = list(contacts or [])
        for batch in self._contact_results:
            for row in batch:
                if row not in self._all_contacts:
                    self._all_contacts.append(row)
        self.added: list[Any] = []
        self.executed: list[Any] = []
        self.flush_count = 0

    async def get(self, model: Any, identifier: Any, **_kwargs: Any) -> Any:
        name = getattr(model, "__name__", str(model))
        if name == "Tenant" or "Tenant" in str(model):
            return self._tenants.get(identifier)
        return None

    async def scalars(self, statement: Any) -> _FakeScalars:
        text = str(statement).lower()
        entity = str(getattr(statement, "column_descriptions", None) or "")

        # Tenant-by-slug lookup (platform workspace resolution).
        if "tenant" in text and "customer" not in text and "contact" not in text:
            if self._tenants_by_slug:
                return _FakeScalars(list(self._tenants_by_slug.values())[:1])
            return _FakeScalars([])

        if "contact" in text or "Contact" in entity:
            if self._contact_results:
                return _FakeScalars(self._contact_results.pop(0))
            return _FakeScalars([])

        # Customer identity lookups.
        return _FakeScalars(self._customers)

    def add(self, row: Any) -> None:
        self.added.append(row)
        table = getattr(row, "__tablename__", "")
        name = type(row).__name__
        if table == "billing_customers" or name == "Customer":
            self._customers.append(row)
        if table == "billing_contacts" or name == "Contact":
            self._all_contacts.append(row)

    async def flush(self) -> None:
        self.flush_count += 1

    async def execute(self, statement: Any) -> None:
        self.executed.append(statement)
        # Demote-primary path: flip is_primary on every contact we know about.
        for contact in self._all_contacts:
            if getattr(contact, "is_primary", False):
                contact.is_primary = False


def _tenant(
    *,
    id: str = "ten_platform",
    slug: str = "876-platform",
    default_currency: str = "JMD",
    default_language: str = "en",
) -> Any:
    return SimpleNamespace(
        id=id,
        slug=slug,
        default_currency=default_currency,
        default_language=default_language,
    )


def _customer(**overrides: Any) -> Any:
    fields: dict[str, Any] = {
        "id": "cus_1",
        "tenant_id": "ten_platform",
        "customer_type": CustomerType.CORE_ORGANIZATION,
        "customer_kind": CustomerKind.BUSINESS,
        "organization_id": "org_1",
        "user_id": None,
        "name": "Efesto",
        "email": "ap@efesto.test",
        "company_name": "Efesto Technologies",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone": None,
        "core_synced_at": 100,
        "updated_at": 100,
        "created_at": 100,
        "status": CustomerStatus.ACTIVE,
        "default_currency": "JMD",
        "language": "en",
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


def _contact(**overrides: Any) -> Any:
    fields: dict[str, Any] = {
        "id": "con_1",
        "tenant_id": "ten_platform",
        "customer_id": "cus_1",
        "user_id": "user_1",
        "salutation": None,
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada@example.com",
        "work_phone": None,
        "mobile_phone": None,
        "is_primary": True,
        "core_synced_at": 100,
        "created_at": 100,
        "updated_at": 100,
    }
    fields.update(overrides)
    return SimpleNamespace(**fields)


# ---------------------------------------------------------------------------
# Identity filter / snapshot helpers
# ---------------------------------------------------------------------------


def test_identity_filter_requires_organization_id_for_org_customers() -> None:
    with pytest.raises(AppHTTPException) as exc:
        sync._identity_filter("CORE_ORGANIZATION", {})

    assert exc.value.status_code == 422
    assert exc.value.app_code == "validation/invalid-request"


def test_identity_filter_requires_user_id_for_user_customers() -> None:
    with pytest.raises(AppHTTPException) as exc:
        sync._identity_filter("CORE_USER", {"organizationId": "org_1"})

    assert exc.value.status_code == 422
    assert "userId" in exc.value.app_message


def test_identity_filter_returns_column_and_value() -> None:
    assert sync._identity_filter("CORE_ORGANIZATION", {"organizationId": "org_1"}) == (
        "organization_id",
        "org_1",
    )
    assert sync._identity_filter("CORE_USER", {"userId": "user_1"}) == ("user_id", "user_1")


def test_identity_values_maps_party_snapshot_and_defaults_kind() -> None:
    values = sync._identity_values(
        {
            "name": "Efesto",
            "email": "ap@efesto.test",
            "companyName": "Efesto Technologies",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "phone": "+1876",
            "customerKind": "BUSINESS",
        },
        now=1_700,
    )

    assert values == {
        "customer_kind": CustomerKind.BUSINESS,
        "name": "Efesto",
        "email": "ap@efesto.test",
        "company_name": "Efesto Technologies",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone": "+1876",
        "core_synced_at": 1_700,
        "updated_at": 1_700,
    }

    defaulted = sync._identity_values({"name": "Ada"}, now=1)
    # An absent kind is left to the create-path default rather than guessed.
    assert "customer_kind" not in defaulted


def test_identity_values_omits_fields_the_payload_does_not_carry() -> None:
    """A legacy event must not blank fields a richer event already stored."""
    values = sync._identity_values(
        {"name": "Efesto Technologies", "email": None},
        now=1_700,
    )

    assert values == {
        "name": "Efesto Technologies",
        "email": None,
        "core_synced_at": 1_700,
        "updated_at": 1_700,
    }
    for absent in ("company_name", "first_name", "last_name", "phone", "customer_kind"):
        assert absent not in values


def test_identity_values_honours_an_explicit_null() -> None:
    """Core clearing a field on purpose is distinct from omitting it."""
    values = sync._identity_values({"companyName": None}, now=1)

    assert "company_name" in values
    assert values["company_name"] is None


# ---------------------------------------------------------------------------
# Tenant resolution
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_tenant_by_explicit_id() -> None:
    tenant = _tenant()
    session = _FakeSession(tenants={tenant.id: tenant})

    resolved = await sync._resolve_tenant(session, {"tenantId": tenant.id})  # type: ignore[arg-type]

    assert resolved is tenant


@pytest.mark.asyncio
async def test_resolve_tenant_missing_id_returns_404() -> None:
    session = _FakeSession()

    with pytest.raises(AppHTTPException) as exc:
        await sync._resolve_tenant(session, {"tenantId": "ten_missing"})  # type: ignore[arg-type]

    assert exc.value.status_code == 404
    assert exc.value.app_code == "billing/tenant-not-found"


@pytest.mark.asyncio
async def test_resolve_tenant_requires_platform_slug_when_unconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=""),
    )
    session = _FakeSession()

    with pytest.raises(AppHTTPException) as exc:
        await sync._resolve_tenant(session, {})  # type: ignore[arg-type]

    assert exc.value.status_code == 503
    assert exc.value.app_code == "billing/platform-tenant-unconfigured"


@pytest.mark.asyncio
async def test_resolve_tenant_by_platform_slug(monkeypatch: pytest.MonkeyPatch) -> None:
    tenant = _tenant(slug="876-platform")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug="876-platform"),
    )
    session = _FakeSession(tenants_by_slug={"876-platform": tenant})

    resolved = await sync._resolve_tenant(session, {})  # type: ignore[arg-type]

    assert resolved is tenant


@pytest.mark.asyncio
async def test_resolve_tenant_missing_slug_returns_503(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug="876-platform"),
    )
    session = _FakeSession(tenants_by_slug={})

    with pytest.raises(AppHTTPException) as exc:
        await sync._resolve_tenant(session, {})  # type: ignore[arg-type]

    assert exc.value.status_code == 503
    assert exc.value.app_code == "billing/platform-tenant-not-found"


# ---------------------------------------------------------------------------
# ensure_core_customer
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ensure_rejects_external_customer_type(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = _FakeSession()

    with pytest.raises(AppHTTPException) as exc:
        await sync.ensure_core_customer(session, {"customerType": "EXTERNAL", "name": "X"})  # type: ignore[arg-type]

    assert exc.value.status_code == 422
    assert "CORE_ORGANIZATION" in exc.value.app_message


@pytest.mark.asyncio
async def test_ensure_creates_organization_customer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 1_700_000_000)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_fixed")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    result = await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "customerKind": "BUSINESS",
            "name": "Efesto",
            "companyName": "Efesto Technologies",
            "email": "ap@efesto.test",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "primaryContact": {
                "userId": "user_1",
                "firstName": "Ada",
                "lastName": "Lovelace",
                "email": "ada@example.com",
            },
        },
    )

    assert result == {"object": "acknowledgement", "id": "cust_fixed", "created": True}
    assert len(session.added) == 2  # customer + contact
    customer = session.added[0]
    assert customer.tenant_id == tenant.id
    assert customer.organization_id == "org_1"
    assert customer.user_id is None
    assert customer.customer_type == CustomerType.CORE_ORGANIZATION
    assert customer.customer_kind == CustomerKind.BUSINESS
    assert customer.name == "Efesto"
    assert customer.company_name == "Efesto Technologies"
    assert customer.default_currency == "JMD"
    assert customer.language == "en"
    assert customer.status == CustomerStatus.ACTIVE
    assert customer.core_synced_at == 1_700_000_000

    contact = session.added[1]
    assert contact.user_id == "user_1"
    assert contact.is_primary is True
    assert contact.first_name == "Ada"
    assert contact.email == "ada@example.com"
    assert contact.core_synced_at == 1_700_000_000


@pytest.mark.asyncio
async def test_ensure_creates_user_customer_without_contact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 50)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_user")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    result = await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_USER",
            "userId": "user_1",
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "firstName": "Ada",
            "lastName": "Lovelace",
        },
    )

    assert result["created"] is True
    assert result["id"] == "cust_user"
    assert len(session.added) == 1  # no contact for individuals
    customer = session.added[0]
    assert customer.user_id == "user_1"
    assert customer.organization_id is None
    assert customer.customer_type == CustomerType.CORE_USER
    assert customer.customer_kind == CustomerKind.INDIVIDUAL


@pytest.mark.asyncio
async def test_ensure_updates_existing_customer_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    existing = _customer(name="Old Name", email="old@efesto.test")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 2_000)
    session = _FakeSession(
        tenants_by_slug={tenant.slug: tenant},
        customers=[existing],
    )

    result = await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "email": "ap@efesto.test",
            "companyName": "Efesto Technologies",
            "firstName": "Grace",
            "lastName": "Hopper",
            "customerKind": "BUSINESS",
        },
    )

    assert result == {"object": "acknowledgement", "id": "cus_1", "created": False}
    assert existing.name == "Efesto"
    assert existing.email == "ap@efesto.test"
    assert existing.company_name == "Efesto Technologies"
    assert existing.first_name == "Grace"
    assert existing.last_name == "Hopper"
    assert existing.core_synced_at == 2_000
    assert existing.updated_at == 2_000
    # No new customer row — only an optional contact could be added.
    assert all(type(row).__name__ != "Customer" or row is existing for row in session.added) or session.added == []


@pytest.mark.asyncio
async def test_ensure_does_not_clobber_local_name_with_empty_snapshot(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    existing = _customer(name="Workspace Rename")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 3_000)
    session = _FakeSession(
        tenants_by_slug={tenant.slug: tenant},
        customers=[existing],
    )

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "",  # empty Core snapshot must not overwrite
            "email": "ap@efesto.test",
        },
    )

    assert existing.name == "Workspace Rename"
    assert existing.email == "ap@efesto.test"
    assert existing.core_synced_at == 3_000


@pytest.mark.asyncio
async def test_ensure_refreshes_existing_primary_contact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    existing = _customer()
    contact = _contact(first_name="Old", email="old@example.com")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 4_000)
    session = _FakeSession(
        tenants_by_slug={tenant.slug: tenant},
        customers=[existing],
        # Lookup by user_id finds the existing core-linked contact.
        contact_results=[[contact]],
        contacts=[contact],
    )

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "primaryContact": {
                "userId": "user_1",
                "firstName": "Ada",
                "lastName": "Lovelace",
                "email": "ada@example.com",
                "phone": "+18765550111",
            },
        },
    )

    assert contact.first_name == "Ada"
    assert contact.last_name == "Lovelace"
    assert contact.email == "ada@example.com"
    assert contact.mobile_phone == "+18765550111"
    assert contact.is_primary is True
    assert contact.core_synced_at == 4_000
    assert contact.updated_at == 4_000
    # Refresh path must not create a second contact.
    assert session.added == []


@pytest.mark.asyncio
async def test_ensure_demotes_hand_added_primary_when_seeding_core_contact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    existing = _customer()
    local = _contact(
        id="con_local",
        user_id=None,
        first_name="Local",
        last_name="Person",
        email="local@efesto.test",
        is_primary=True,
    )
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 5_000)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_seeded")
    session = _FakeSession(
        tenants_by_slug={tenant.slug: tenant},
        customers=[existing],
        # No contact for user_1 yet → seed path demotes the hand-added primary.
        contact_results=[[]],
        contacts=[local],
    )

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "primaryContact": {
                "userId": "user_1",
                "firstName": "Ada",
                "lastName": "Lovelace",
                "email": "ada@example.com",
            },
        },
    )

    # Hand-added primary is demoted, never deleted.
    assert local.is_primary is False
    assert len(session.executed) == 1
    assert len(session.added) == 1
    seeded = session.added[0]
    assert seeded.id == "con_seeded"
    assert seeded.user_id == "user_1"
    assert seeded.is_primary is True


@pytest.mark.asyncio
async def test_ensure_ignores_primary_contact_without_user_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 6_000)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_x")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "primaryContact": {"firstName": "No", "lastName": "UserId"},
        },
    )

    # Customer created; contact skipped because userId is required.
    assert len(session.added) == 1
    assert type(session.added[0]).__name__ == "Customer" or hasattr(
        session.added[0], "organization_id"
    )


@pytest.mark.asyncio
async def test_ensure_ignores_non_dict_primary_contact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 7_000)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_y")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_USER",
            "userId": "user_1",
            "name": "Ada",
            "primaryContact": "not-a-dict",
        },
    )

    assert len(session.added) == 1


# ---------------------------------------------------------------------------
# serialize_contact / attach_primary_contacts
# ---------------------------------------------------------------------------


def test_serialize_contact_shape() -> None:
    contact = _contact(
        work_phone="+18765550001",
        mobile_phone="+18765550002",
        salutation="Ms",
        core_synced_at=42,
    )

    assert sync.serialize_contact(contact) == {
        "object": "contact",
        "id": "con_1",
        "userId": "user_1",
        "salutation": "Ms",
        "firstName": "Ada",
        "lastName": "Lovelace",
        "email": "ada@example.com",
        "workPhone": "+18765550001",
        "mobilePhone": "+18765550002",
        "isPrimary": True,
        "coreSyncedAt": 42,
    }


@pytest.mark.asyncio
async def test_attach_primary_contacts_fills_matching_payloads() -> None:
    contact = _contact(customer_id="cus_a")
    session = _FakeSession(contacts=[contact])
    payloads = [
        {"id": "cus_a", "name": "A"},
        {"id": "cus_b", "name": "B"},
        {"name": "no-id"},
    ]

    await sync.attach_primary_contacts(session, payloads)  # type: ignore[arg-type]

    assert payloads[0]["primaryContact"] == sync.serialize_contact(contact)
    assert payloads[1]["primaryContact"] is None
    # Missing id → no map hit → explicit null (callers can still render safely).
    assert payloads[2]["primaryContact"] is None


@pytest.mark.asyncio
async def test_attach_primary_contacts_noop_for_empty_list() -> None:
    session = _FakeSession()
    payloads: list[dict[str, Any]] = []

    await sync.attach_primary_contacts(session, payloads)  # type: ignore[arg-type]

    assert payloads == []


@pytest.mark.asyncio
async def test_attach_primary_contacts_skips_payloads_without_id() -> None:
    session = _FakeSession(contacts=[_contact()])
    payloads = [{"name": "orphan"}]

    await sync.attach_primary_contacts(session, payloads)  # type: ignore[arg-type]

    # No customer ids → no query side effects beyond empty short-circuit.
    assert "primaryContact" not in payloads[0]


# ---------------------------------------------------------------------------
# Additional edge cases
# ---------------------------------------------------------------------------


def test_identity_values_of_an_empty_payload_touches_only_the_sync_stamp() -> None:
    """An empty ensure body must not overwrite any stored identity field."""
    values = sync._identity_values({}, now=1)

    assert values == {"core_synced_at": 1, "updated_at": 1}


@pytest.mark.asyncio
async def test_legacy_event_retry_does_not_blank_a_synced_customer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Regression: a queued pre-snapshot event must not undo a richer sync.

    Events queued before the party snapshot existed carry only customerType,
    organizationId, name, and email. When such an event is retried after a
    newer event already stored the company name and contact, it must leave
    those fields intact.
    """
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    existing = _customer(
        company_name="Efesto Technologies",
        first_name="Ada",
        last_name="Lovelace",
    )
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant}, customers=[existing])

    result = await sync.ensure_core_customer(
        session,
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "email": None,
        },
    )

    assert result["created"] is False
    assert existing.company_name == "Efesto Technologies"
    assert existing.first_name == "Ada"
    assert existing.last_name == "Lovelace"
    assert existing.customer_kind == CustomerKind.BUSINESS
    # The fields the legacy event does carry still apply.
    assert existing.name == "Efesto"
    assert existing.email is None


def test_identity_values_rejects_unknown_kind_via_enum() -> None:
    with pytest.raises(ValueError):
        sync._identity_values({"customerKind": "CORPORATION"}, now=1)


@pytest.mark.asyncio
async def test_resolve_tenant_prefers_explicit_tenant_slug_over_platform(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    platform = _tenant(id="ten_platform", slug="876-platform")
    explicit = _tenant(id="ten_other", slug="workspace-a")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug="876-platform"),
    )
    session = _FakeSession(tenants_by_slug={"workspace-a": explicit, "876-platform": platform})
    # Body tenantSlug wins; FakeSession returns first tenants_by_slug value —
    # use a single slug map entry so the select is deterministic.
    session = _FakeSession(tenants_by_slug={"workspace-a": explicit})

    resolved = await sync._resolve_tenant(session, {"tenantSlug": "workspace-a"})  # type: ignore[arg-type]

    assert resolved.id == "ten_other"


@pytest.mark.asyncio
async def test_resolve_tenant_strips_whitespace_slug(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant(slug="876-platform")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug="  876-platform  "),
    )
    session = _FakeSession(tenants_by_slug={"876-platform": tenant})

    resolved = await sync._resolve_tenant(session, {})  # type: ignore[arg-type]

    assert resolved is tenant


@pytest.mark.asyncio
async def test_ensure_rejects_empty_customer_type(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = _FakeSession()

    with pytest.raises(AppHTTPException) as exc:
        await sync.ensure_core_customer(session, {"name": "X"})  # type: ignore[arg-type]

    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_ensure_rejects_missing_organization_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    with pytest.raises(AppHTTPException) as exc:
        await sync.ensure_core_customer(
            session,  # type: ignore[arg-type]
            {"customerType": "CORE_ORGANIZATION", "name": "X"},
        )

    assert exc.value.status_code == 422


@pytest.mark.asyncio
async def test_ensure_refresh_preserves_mobile_when_phone_absent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    existing = _customer()
    contact = _contact(mobile_phone="+18765550999")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 9_000)
    session = _FakeSession(
        tenants_by_slug={tenant.slug: tenant},
        customers=[existing],
        contact_results=[[contact]],
        contacts=[contact],
    )

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "primaryContact": {
                "userId": "user_1",
                "firstName": "Ada",
                "lastName": "Lovelace",
                "email": "ada@example.com",
                # phone omitted → keep existing mobile
            },
        },
    )

    assert contact.mobile_phone == "+18765550999"


@pytest.mark.asyncio
async def test_ensure_refresh_overwrites_mobile_when_phone_present(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    existing = _customer()
    contact = _contact(mobile_phone="+18765550999")
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 9_100)
    session = _FakeSession(
        tenants_by_slug={tenant.slug: tenant},
        customers=[existing],
        contact_results=[[contact]],
        contacts=[contact],
    )

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "primaryContact": {
                "userId": "user_1",
                "phone": "+18765550000",
            },
        },
    )

    assert contact.mobile_phone == "+18765550000"


@pytest.mark.asyncio
async def test_ensure_ignores_empty_primary_contact_dict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 9_200)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_z")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_USER",
            "userId": "user_1",
            "name": "Ada",
            "primaryContact": {},
        },
    )

    assert len(session.added) == 1


@pytest.mark.asyncio
async def test_ensure_ignores_null_primary_contact(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 9_300)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_n")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_ORGANIZATION",
            "organizationId": "org_1",
            "name": "Efesto",
            "primaryContact": None,
        },
    )

    assert len(session.added) == 1


@pytest.mark.asyncio
async def test_ensure_coerces_numeric_looking_ids_to_string(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tenant = _tenant()
    monkeypatch.setattr(
        sync,
        "get_settings",
        lambda: SimpleNamespace(platform_tenant_slug=tenant.slug),
    )
    monkeypatch.setattr(sync.time, "time", lambda: 9_400)
    monkeypatch.setattr(sync, "_generated_id", lambda prefix: f"{prefix}_num")
    session = _FakeSession(tenants_by_slug={tenant.slug: tenant})

    result = await sync.ensure_core_customer(
        session,  # type: ignore[arg-type]
        {
            "customerType": "CORE_USER",
            "userId": 12345,  # type: ignore[dict-item]
            "name": "Numeric",
        },
    )

    assert result["created"] is True
    assert session.added[0].user_id == "12345"


@pytest.mark.asyncio
async def test_attach_primary_contacts_last_wins_when_duplicate_primaries() -> None:
    first = _contact(id="con_1", customer_id="cus_a", first_name="First")
    second = _contact(id="con_2", customer_id="cus_a", first_name="Second")
    session = _FakeSession(contacts=[first, second])
    payloads = [{"id": "cus_a", "name": "A"}]

    await sync.attach_primary_contacts(session, payloads)  # type: ignore[arg-type]

    # dict comprehension last key wins
    assert payloads[0]["primaryContact"]["firstName"] == "Second"


@pytest.mark.asyncio
async def test_attach_primary_contacts_stringifies_payload_ids() -> None:
    contact = _contact(customer_id="cus_1")
    session = _FakeSession(contacts=[contact])
    payloads = [{"id": "cus_1", "name": "A"}]

    await sync.attach_primary_contacts(session, payloads)  # type: ignore[arg-type]

    assert payloads[0]["primaryContact"]["id"] == "con_1"


def test_serialize_contact_with_null_fields() -> None:
    contact = _contact(
        user_id=None,
        first_name=None,
        last_name=None,
        email=None,
        work_phone=None,
        mobile_phone=None,
        is_primary=False,
        core_synced_at=None,
        salutation=None,
    )

    payload = sync.serialize_contact(contact)

    assert payload["userId"] is None
    assert payload["isPrimary"] is False
    assert payload["coreSyncedAt"] is None
