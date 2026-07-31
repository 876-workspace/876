"""Report and repair drift between WorkOS and the local 876 database.

WorkOS is the credential store; the 876 database is the platform record. Every
WorkOS user/organization/membership should have exactly one local counterpart
and vice versa. Historically the admin delete/purge routes only wrote locally,
so the provider accumulated records that no 876 row pointed at — accounts that
could still authenticate but were invisible in Console.

The lifecycle routes now keep both sides in step. This script exists for the
residual cases that no route can cover: records created before that fix, and
the window where a provider call succeeded but the local transaction did not.

Run the report first — it never writes:

    .venv/bin/python scripts/reconcile_workos.py

Then apply exactly the repairs you want:

    --relink            attach local rows to the WorkOS record they already match
    --adopt-users       create local rows for WorkOS users that have none
    --adopt-orgs        create local rows for WorkOS orgs that have none
    --delete-orphans    delete WorkOS records that have no local counterpart

`--delete-orphans` is irreversible at the provider and destroys credentials.
It refuses to run unless `--yes` is also given.
"""

# ruff: noqa: E402

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_API_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_API_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings, is_platform_owner_email
from core.id import generate_id, generate_platform_owner_user_id
from core.timestamps import now_unix_seconds
from db.models import Membership, Organization, User
from db.session import AsyncSessionLocal, _make_engine
from providers.protocol import AuthProvider
from providers.workos.adapter import get_auth_provider


@dataclass
class Drift:
    """Everything the report found, grouped by the repair that fixes it."""

    provider_only_users: list[dict[str, Any]] = field(default_factory=list)
    provider_only_orgs: list[dict[str, Any]] = field(default_factory=list)
    provider_only_memberships: list[dict[str, Any]] = field(default_factory=list)
    foreign_orgs: list[dict[str, Any]] = field(default_factory=list)
    local_only_users: list[User] = field(default_factory=list)
    local_only_orgs: list[Organization] = field(default_factory=list)
    relinkable_orgs: list[tuple[Organization, str]] = field(default_factory=list)
    relinkable_memberships: list[tuple[Membership, str]] = field(default_factory=list)

    @property
    def is_clean(self) -> bool:
        """True when nothing is repairable. `foreign_orgs` is not drift."""
        return not any(
            (
                self.provider_only_users,
                self.provider_only_orgs,
                self.provider_only_memberships,
                self.local_only_users,
                self.local_only_orgs,
                self.relinkable_orgs,
                self.relinkable_memberships,
            )
        )


def _is_876_organization(provider_org: dict[str, Any]) -> bool:
    """Whether 876 created this WorkOS organization.

    Every org 876 creates stamps the local id (or, in older code, the slug) into
    `external_id` and carries a `slug` in metadata. An org with neither was made
    outside 876 — the environment's default test organization, or one added by
    hand in the WorkOS dashboard. Those are not 876's to reconcile or delete;
    WorkOS refuses to delete the default one at all.
    """
    return bool(provider_org.get("external_id") or (provider_org.get("metadata") or {}).get("slug"))


async def collect_drift(db: AsyncSession, provider: AuthProvider) -> Drift:
    provider_users = await provider.list_users()
    provider_orgs = await provider.list_organizations()

    # WorkOS rejects an unfiltered membership listing, so walk it org by org.
    # Every membership belongs to an organization, so this is still exhaustive.
    provider_memberships: list[dict[str, Any]] = []
    for provider_org in provider_orgs:
        provider_memberships.extend(await provider.list_organization_memberships(organization_id=provider_org["id"]))

    local_users = list((await db.scalars(select(User).where(User.deleted_at.is_(None)))).all())
    local_orgs = list((await db.scalars(select(Organization).where(Organization.deleted_at.is_(None)))).all())
    local_memberships = list((await db.scalars(select(Membership).where(Membership.deleted_at.is_(None)))).all())

    users_by_workos_id = {u.workos_user_id: u for u in local_users if u.workos_user_id}
    users_by_email = {u.email.lower(): u for u in local_users}
    orgs_by_workos_id = {o.workos_organization_id: o for o in local_orgs if o.workos_organization_id}
    memberships_by_workos_id = {m.workos_membership_id for m in local_memberships if m.workos_membership_id}

    drift = Drift()

    for provider_user in provider_users:
        if provider_user["id"] not in users_by_workos_id:
            drift.provider_only_users.append(provider_user)

    provider_user_ids = {u["id"] for u in provider_users}
    for user in local_users:
        if user.workos_user_id not in provider_user_ids:
            drift.local_only_users.append(user)

    # An unlinked local org and a WorkOS org may already be the same org: newer
    # code stamps the local org id into `external_id`, older code stamped the
    # slug. Match on either, and consume each candidate so two WorkOS orgs can
    # never claim the same local row.
    unlinked_orgs_by_slug = {o.slug: o for o in local_orgs if not o.workos_organization_id and o.slug}
    unlinked_orgs_by_id = {o.id: o for o in local_orgs if not o.workos_organization_id}
    for provider_org in provider_orgs:
        if provider_org["id"] in orgs_by_workos_id:
            continue

        external_id = provider_org.get("external_id") or ""
        provider_slug = (provider_org.get("metadata") or {}).get("slug") or ""
        org_match = (
            unlinked_orgs_by_id.get(external_id)
            or unlinked_orgs_by_slug.get(external_id)
            or unlinked_orgs_by_slug.get(provider_slug)
        )
        if org_match is None:
            bucket = drift.provider_only_orgs if _is_876_organization(provider_org) else drift.foreign_orgs
            bucket.append(provider_org)
            continue

        unlinked_orgs_by_id.pop(org_match.id, None)
        unlinked_orgs_by_slug.pop(org_match.slug, None)
        drift.relinkable_orgs.append((org_match, provider_org["id"]))
        # Membership matching below keys off this map, so a pending relink has
        # to be visible there — otherwise the org's memberships all read as
        # provider-only and would be proposed for deletion.
        orgs_by_workos_id[provider_org["id"]] = org_match

    provider_org_ids = {o["id"] for o in provider_orgs}
    relinked_org_ids = {org.id for org, _ in drift.relinkable_orgs}
    for org in local_orgs:
        if org.id in relinked_org_ids:
            continue
        if org.workos_organization_id not in provider_org_ids:
            drift.local_only_orgs.append(org)

    local_membership_by_pair = {
        (m.organization_id, m.user_id): m for m in local_memberships if m.workos_membership_id is None
    }
    for provider_membership in provider_memberships:
        if provider_membership["id"] in memberships_by_workos_id:
            continue
        membership_org = orgs_by_workos_id.get(provider_membership["organization_id"])
        membership_user = users_by_workos_id.get(provider_membership["user_id"])
        membership_match = (
            local_membership_by_pair.get((membership_org.id, membership_user.id))
            if membership_org and membership_user
            else None
        )
        if membership_match is not None:
            drift.relinkable_memberships.append((membership_match, provider_membership["id"]))
        else:
            drift.provider_only_memberships.append(provider_membership)

    # Surface an email collision explicitly — adopting such a user would violate
    # the users.email unique index, so the operator must resolve it by hand.
    for provider_user in drift.provider_only_users:
        provider_user["_email_taken"] = provider_user["email"].lower() in users_by_email

    return drift


def print_report(drift: Drift) -> None:
    print("── WorkOS ⇄ 876 reconciliation ──────────────────────────────────")

    if drift.foreign_orgs:
        print(f"\nWorkOS organizations not created by 876 ({len(drift.foreign_orgs)})  → ignored, not drift")
        for foreign_org in drift.foreign_orgs:
            print(f"  {foreign_org['id']:<40} {foreign_org['name']}")

    if drift.is_clean:
        print("\nNo drift: every 876 record has a counterpart on both sides.")
        return

    if drift.relinkable_orgs:
        print(f"\nOrganizations linkable to an existing WorkOS org ({len(drift.relinkable_orgs)})  → --relink")
        for org, workos_id in drift.relinkable_orgs:
            print(f"  {org.id}  {org.slug:<24} → {workos_id}")

    if drift.relinkable_memberships:
        print(
            f"\nMemberships linkable to an existing WorkOS membership ({len(drift.relinkable_memberships)})  → --relink"
        )
        for membership, workos_id in drift.relinkable_memberships:
            print(f"  {membership.id}  org={membership.organization_id} → {workos_id}")

    if drift.provider_only_users:
        print(f"\nIn WorkOS, not in 876 ({len(drift.provider_only_users)} users)  → --adopt-users or --delete-orphans")
        for user in drift.provider_only_users:
            collision = "  ⚠ email already used by a local account" if user.get("_email_taken") else ""
            print(f"  {user['id']:<40} {user['email']:<40} verified={user.get('email_verified')}{collision}")

    if drift.provider_only_orgs:
        print(f"\nIn WorkOS, not in 876 ({len(drift.provider_only_orgs)} orgs)  → --adopt-orgs or --delete-orphans")
        for provider_org in drift.provider_only_orgs:
            print(f"  {provider_org['id']:<40} {provider_org['name']}")

    if drift.provider_only_memberships:
        print(f"\nIn WorkOS, not in 876 ({len(drift.provider_only_memberships)} memberships)  → --delete-orphans")
        for provider_membership in drift.provider_only_memberships:
            print(
                f"  {provider_membership['id']:<40} "
                f"org={provider_membership['organization_id']} user={provider_membership['user_id']}"
            )

    if drift.local_only_users:
        print(f"\nIn 876, not in WorkOS ({len(drift.local_only_users)} users)  → no automatic repair")
        for local_user in drift.local_only_users:
            print(f"  {local_user.id:<40} {local_user.email:<40} workos={local_user.workos_user_id}")

    if drift.local_only_orgs:
        print(f"\nIn 876, not in WorkOS ({len(drift.local_only_orgs)} orgs)  → no automatic repair")
        for local_org in drift.local_only_orgs:
            print(f"  {local_org.id:<40} {local_org.slug:<24} workos={local_org.workos_organization_id}")


async def relink(db: AsyncSession, drift: Drift) -> int:
    changed = 0
    now = now_unix_seconds()

    for org, workos_id in drift.relinkable_orgs:
        org.workos_organization_id = workos_id
        org.updated_at = now
        changed += 1
        print(f"  relinked org {org.id} → {workos_id}")

    for membership, workos_id in drift.relinkable_memberships:
        membership.workos_membership_id = workos_id
        membership.updated_at = now
        changed += 1
        print(f"  relinked membership {membership.id} → {workos_id}")

    return changed


async def adopt_users(db: AsyncSession, drift: Drift) -> int:
    adopted = 0
    now = now_unix_seconds()

    for provider_user in drift.provider_only_users:
        email = provider_user["email"].lower().strip()
        if provider_user.get("_email_taken"):
            print(f"  skipped {provider_user['id']} — {email} already belongs to a local account")
            continue

        user_id = generate_platform_owner_user_id() if is_platform_owner_email(email) else generate_id("user")
        db.add(
            User(
                id=user_id,
                workos_user_id=provider_user["id"],
                email=email,
                email_verified=bool(provider_user.get("email_verified")),
                first_name=provider_user.get("first_name") or email.split("@")[0],
                last_name=provider_user.get("last_name") or "User",
                avatar=provider_user.get("profile_picture_url"),
                role="user",
                platform_role="owner" if is_platform_owner_email(email) else None,
                status="active",
                created_at=now,
                updated_at=now,
            )
        )
        adopted += 1
        print(f"  adopted user {provider_user['id']} → {user_id} ({email})")

    return adopted


async def adopt_orgs(db: AsyncSession, drift: Drift) -> int:
    from core.id import normalize_slug
    from services.provisioning import provision_organization

    adopted = 0
    now = now_unix_seconds()
    taken_slugs = {slug for slug in (await db.scalars(select(Organization.slug))).all() if slug}

    for provider_org in drift.provider_only_orgs:
        metadata = provider_org.get("metadata") or {}
        base_slug = normalize_slug(metadata.get("slug") or provider_org["name"])
        slug = base_slug
        suffix = 2
        while slug in taken_slugs:
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        taken_slugs.add(slug)

        organization_id = generate_id("organization")
        db.add(
            Organization(
                id=organization_id,
                workos_organization_id=provider_org["id"],
                name=provider_org["name"],
                slug=slug,
                status="active",
                metadata_=metadata or None,
                created_at=now,
                updated_at=now,
            )
        )
        await db.flush()
        await provision_organization(db, organization_id, now)
        adopted += 1
        print(f"  adopted org {provider_org['id']} → {organization_id} ({slug})")

    return adopted


async def delete_orphans(provider: AuthProvider, drift: Drift) -> int:
    """Delete every provider record with no local counterpart.

    A single refusal must not abort the run — WorkOS rejects deletion of the
    environment's default organization with a 403, and letting that stop the
    sweep leaves every record after it untouched. Failures are reported at the
    end so the operator can see exactly what survived.
    """
    deleted = 0
    failures: list[str] = []

    async def attempt(label: str, coro: Any) -> None:
        nonlocal deleted
        try:
            await coro
        except Exception as exc:  # noqa: BLE001 — report and continue
            failures.append(f"{label}: {exc}")
            print(f"  FAILED {label} — {exc}")
            return
        deleted += 1
        print(f"  deleted {label}")

    # Memberships, then organizations, then users: deleting a parent first
    # would make the child deletes report as spurious failures.
    for membership in drift.provider_only_memberships:
        await attempt(
            f"WorkOS membership {membership['id']}",
            provider.delete_organization_membership(membership_id=membership["id"]),
        )

    for provider_org in drift.provider_only_orgs:
        await attempt(
            f"WorkOS organization {provider_org['id']} ({provider_org['name']})",
            provider.delete_organization(organization_id=provider_org["id"]),
        )

    for provider_user in drift.provider_only_users:
        await attempt(
            f"WorkOS user {provider_user['id']} ({provider_user['email']})",
            provider.delete_user(user_id=provider_user["id"]),
        )

    if failures:
        print(f"\n{len(failures)} provider deletion(s) refused — these still need a manual decision:")
        for failure in failures:
            print(f"  {failure}")

    return deleted


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--relink", action="store_true", help="Attach local rows to the WorkOS record they match.")
    parser.add_argument("--adopt-users", action="store_true", help="Create local rows for WorkOS-only users.")
    parser.add_argument("--adopt-orgs", action="store_true", help="Create local rows for WorkOS-only organizations.")
    parser.add_argument(
        "--delete-orphans",
        action="store_true",
        help="Delete WorkOS records with no local counterpart. Irreversible; requires --yes.",
    )
    parser.add_argument("--yes", action="store_true", help="Confirm irreversible provider deletions.")
    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is required to reconcile against the local database.")
    if not settings.workos_api_key:
        raise RuntimeError("WORKOS_API_KEY is required to read the provider directory.")

    if args.delete_orphans and not args.yes:
        raise SystemExit("--delete-orphans permanently removes WorkOS records. Re-run with --yes to confirm.")

    provider = get_auth_provider(settings)
    engine = _make_engine(settings.database_url)
    AsyncSessionLocal.configure(bind=engine)

    try:
        async with AsyncSessionLocal() as db:
            drift = await collect_drift(db, provider)
            print_report(drift)

            if not any((args.relink, args.adopt_users, args.adopt_orgs, args.delete_orphans)):
                print("\nReport only. Re-run with a repair flag to apply changes.")
                return

            print("\n── applying ─────────────────────────────────────────────────────")
            # Local repairs first: they commit as one transaction, so a failure
            # leaves the provider untouched and the report still accurate.
            if args.relink:
                await relink(db, drift)
            if args.adopt_users:
                await adopt_users(db, drift)
            if args.adopt_orgs:
                await adopt_orgs(db, drift)
            await db.commit()

            if args.delete_orphans:
                await delete_orphans(provider, drift)

            print("\nDone. Re-run without flags to confirm the drift is cleared.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
