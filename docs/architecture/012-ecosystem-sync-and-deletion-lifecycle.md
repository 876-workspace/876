# ADR-012 — Ecosystem sync consistency & the deletion lifecycle

Status: accepted (2026-08-14)
Supersedes/extends: ADR-009 (customer/account architecture), ADR-011 (unified facade).

## Context

Deleting or purging an organization in Console did not remove the matching
`billing_customers` row in the operator (efesto) workspace, so purged test orgs
kept surfacing as customers in 876 Billing. Root causes, all confirmed in code:

1. **The Core→Billing sync is ensure-only.** `billing-customer-sync.ts` emits a
   single event type, `customer.ensure` (upsert); the billing-api
   `workflows/customer_sync.py` only knows how to upsert. Nothing ever tells
   Billing a party is gone.
2. **Reconcile re-creates deleted parties.** `billing-customer-sync.repository.ts`
   `listOrganizations()` does not filter `deletedAt`, so the reconcile sweep
   re-enqueues ensure events for tombstoned orgs.
3. **`enqueueCustomerEnsure` is a NOOP in every production caller** (PR #258), so
   orgs reach Billing only via the sweep, not at creation.
4. **Session validation trusts the sealed cookie snapshot.** A deleted user keeps
   a "valid" session, passes sign-in, then fails the org-membership check and is
   sent to `/no-access` — the wrong outcome for "this account no longer exists".
5. **Delete removes the WorkOS record.** `deleteOrganization`/`deleteUser` both
   call the WorkOS delete, so a reversible "Delete" is actually destructive at the
   identity provider.

## Decisions

### D1 — Console lifecycle: Delete is reversible, Purge is destructive

| Action                   | Local                  | WorkOS          | Visibility                                                                            | Reversible |
| ------------------------ | ---------------------- | --------------- | ------------------------------------------------------------------------------------- | ---------- |
| **Delete**               | tombstone / deactivate | **left intact** | hidden from the account's own reads and every other app; **still visible in Console** | yes        |
| **Purge** (Console-only) | hard delete            | **removed**     | gone everywhere                                                                       | no         |

WorkOS stays the identity source of record. "A deleted/disabled user cannot sign
in" is enforced by session validation (D3), **not** by removing the WorkOS record.
Delete stops calling the WorkOS delete; only Purge calls it.

### D2 — Org Delete cascades softly to memberships; accounts are never touched

Deleting an org soft-deletes its memberships and app enrollments in the same
action (Purge hard-deletes them). Member **accounts** are untouched — a person is
an identity that can belong to many orgs. Someone whose only workspace was deleted
lands on the improved no-access screen with a way out (Google-Workspace behavior).
This replaces today's "remove all members before deleting" guard.

### D3 — Session validation rejects unknown / soft-deleted / inactive principals

Each app's `guards.ts` session bootstrap resolves the sealed cookie to the full
user. If that user is missing (404), tombstoned (410), or not active (inactive /
suspended / banned), the guard treats the session as **invalid** — clears the
cookie and redirects to `/login` — rather than surfacing `/no-access`. `/no-access`
means "you're signed in but this workspace isn't yours"; a vanished account is a
sign-in problem, not an authorization one.

### D4 — Deletion propagates to Billing via `status` on the ensure snapshot

Rather than a second event type and a new billing-api route (routes there are
generated and dispatched by special-case), the ensure snapshot carries the party's
current lifecycle `status` (`ACTIVE` | `ARCHIVED`, matching `CustomerStatus`):

- A live org/user → `ACTIVE`. A soft-deleted, disabled, suspended, or banned
  org/user, and a just-purged one → `ARCHIVED`.
- `snapshotForOrganization` / `snapshotForUser` derive `status` from
  `deletedAt` + the row `status`. The outbox row and payload carry it.
- Delete, Purge, and restore all enqueue an ensure. **Purge enqueues before the
  hard delete**, using the last-known snapshot.
- billing-api `ensure_core_customer` honors incoming `status`: it updates an
  existing customer's `status`; when the payload is `ARCHIVED` and **no** customer
  exists, it is a no-op (never materialize a customer that was never active).
  Billing **archives**, never hard-deletes — invoices and finance history survive.
- **Reconcile includes soft-deleted orgs as `ARCHIVED`**, actively healing drift
  instead of merely not re-creating it.

This keeps the outbox's idempotent "mirror current state" contract and needs no
new Billing endpoint.

### D5 — Provisioning wires the real enqueue; free tier is the default price

`provisionOrganization` receives a real `enqueueCustomerEnsure` at every creation
site (admin `createOrganization`, business signup, product-app onboarding), so a
new org appears in Billing at creation. `provisionOrgApps` continues to attach the
default apps and the source app and to seed the `active` subscription from
`findDefaultPriceForApp` — every product must have a free plan/price seeded so that
lookup resolves.

## Sequencing

- **Phase 1** — D3, D4, D1, D2 (stop the leak + session correctness).
- **Phase 2** — D5 (wire enqueue, verify free-plan seeding, WorkOS↔local sync
  consistency for users/orgs/memberships).
- **Phase 3** — org/membership-management **foundations only**: a shared
  members/roles contract and a real no-access sign-out, as the base for the future
  Entra-style 876 Enterprise suite and per-app team settings. Full build is later.

## Consequences

- Billing customers gain an `ARCHIVED` state driven by identity lifecycle; Billing
  UIs must treat archived customers as non-active (they already filter by status).
- A soft-deleted user's WorkOS credentials remain valid; D3 is the enforcement
  boundary, so D3 and D1 must ship together.
- Restoring a deleted org/user re-emits `ACTIVE` and un-archives its billing
  customer.
