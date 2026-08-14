# Codex brief — Billing customer-sync `status`/archive lifecycle (Phase 1a)

Model: gpt-5.6-sol, medium. Branch is already `feat/ecosystem-sync-consistency`.
Design authority: `docs/architecture/012-ecosystem-sync-and-deletion-lifecycle.md` (read §D4 first).

## The problem you are fixing

Deleting/purging an org in Console leaves a stale `billing_customers` row in the
Billing operator workspace, because the Core→Billing sync is **ensure-only** (no
delete path) and the reconcile sweep re-creates ensure events for tombstoned orgs.

## The design (do exactly this — no new billing-api route, no second event type)

Carry the party's lifecycle `status` (`'ACTIVE' | 'ARCHIVED'`) on the existing
`customer.ensure` snapshot/payload. A live org/user is `ACTIVE`; a soft-deleted,
inactive, suspended, or banned one is `ARCHIVED`. billing-api's ensure workflow
honors the incoming status. Reconcile includes deleted orgs as `ARCHIVED`.

## Files & changes (Core — Express/TypeScript, `apps/api`)

> **IMPORTANT SCHEMA NOTE (resolves the conflict you found):** the outbox already has a
> `status` column that stores **delivery** state (`pending|processing|delivered|failed`) and
> is used by `ix_billing_customer_outbox_delivery`. Do **not** touch or reuse it. The party
> lifecycle goes in a **new, separate** column `customer_status`. The wire payload field is
> still named `status` (that is what billing-api reads) — only the DB column differs.

1. `apps/api/prisma/schema/billing-customer-outbox.prisma`
   - Add `customerStatus String @default("ACTIVE") @map("customer_status") @db.VarChar` to
     `BillingCustomerOutbox`. Leave the existing `status` (delivery) column untouched.

2. Add a prisma migration under `apps/api/prisma/migrations/` (new timestamped dir,
   `migration.sql`) matching the existing migration style:
   `ALTER TABLE "billing_customer_outbox" ADD COLUMN "customer_status" VARCHAR NOT NULL DEFAULT 'ACTIVE';`
   Then regenerate the client and typecheck (commands below). Do NOT edit files under
   `apps/api/src/db/generated/` by hand — regenerate them.

3. `apps/api/src/services/billing-customer-sync.ts`
   - Add `status: string` to `PartySnapshot` (the lifecycle: `'ACTIVE' | 'ARCHIVED'`).
   - Add `customerStatus: string` to `BillingCustomerOutboxRow` (maps the new DB column).
   - `OrganizationRow`/`UserRow`: add optional `deletedAt?: bigint | null` and
     `status?: string | null` inputs used only to derive the snapshot lifecycle.
   - Add a helper `function lifecycleStatus(deletedAt, rowStatus): 'ACTIVE' | 'ARCHIVED'`:
     ARCHIVED when `deletedAt != null` OR (`rowStatus` present and not `'active'`); else ACTIVE.
   - `snapshotForOrganization` and `snapshotForUser` set the snapshot `status` via that helper.
   - `applySnapshot` copies `snapshot.status` onto `event.customerStatus`; the new-event object
     literal initializes `customerStatus: 'ACTIVE'` before `applySnapshot`.
   - `updateOutboxEvent(...)` call in `enqueueCustomerEnsure` must include `customerStatus`.
   - `customerEventPayload` includes `status: event.customerStatus` in `common`.
   - Add `enqueueCustomerArchiveForOrganization(deps, organization, now)` and
     `enqueueCustomerArchiveForUser(deps, user, now)` that build the snapshot, force
     `snapshot.status = 'ARCHIVED'`, and call the private `enqueueCustomerEnsure`.
     (These are what the delete/purge paths will call — added in a later change; export them now.)
   - `enqueueReconcileAll`: unchanged in logic, but it now naturally archives deleted
     orgs because the snapshot status reflects `deletedAt` (see repo change below).

4. `apps/api/src/services/billing-customer-sync.repository.ts`
   - `listOrganizations()`: **remove the `deletedAt: null` implicit filter by including
     tombstoned rows** — this list has no filter today, so just add `deletedAt: true` and
     `status: true` to the `select` (and any org `status` column name — confirm it's `status`).
   - `findUserById(...)`: add `status: true` and `deletedAt: true` to the `select`.
   - Ensure the returned rows satisfy the widened `OrganizationRow`/`UserRow` types.

5. `apps/api/src/workers/billing-customer-dispatch.repository.ts`
   - Confirm the claim query returns the full outbox row **including `customerStatus`** (if it
     uses an explicit `select`, add `customerStatus`). `customerEventPayload` must see it.

## Files & changes (Billing — FastAPI/Python, `apps/billing-api`)

6. `apps/billing-api/domains/billing/workflows/customer_sync.py`
   - In `_identity_values`, when `body` carries `status`, map it to the `status` column as
     `CustomerStatus(str(body["status"]))` (import from `db.models.generated.enums`).
   - In `ensure_core_customer`: when `existing is None` **and** the requested status is
     `ARCHIVED`, return a no-op acknowledgement (`{"object": "acknowledgement", "id": None,
"created": False}`) — never materialize a customer that was never active. When existing
     is not None, the status update flows through the existing setattr loop.

## Tests (write real, failing-capable tests per .claude/rules/testing.md)

- Core: extend `apps/api/src/services/__tests__/billing-customer-sync.test.ts`:
  - `snapshotForOrganization`/`snapshotForUser` return `status: 'ARCHIVED'` when `deletedAt`
    set or row status non-active; `'ACTIVE'` otherwise.
  - `enqueueCustomerArchiveForOrganization` enqueues an event whose payload status is ARCHIVED.
  - `enqueueReconcileAll` over a deleted org produces an ARCHIVED ensure event.
  - `customerEventPayload` includes `status`.
- Billing: extend `apps/billing-api/tests/test_customer_sync.py`:
  - ensure with `status='ARCHIVED'` on an existing customer sets `status=ARCHIVED`.
  - ensure with `status='ARCHIVED'` and no existing customer is a no-op (no row created).
  - ensure with `status='ACTIVE'` (or omitted) on an existing archived customer reactivates it.

## Verification (run all; report exact results — do not claim green without output)

- `cd /root/projects/876 && pnpm --filter @876/api prisma:generate` (or the repo's generate script)
- `pnpm --filter @876/api typecheck`
- `pnpm --filter @876/api test`
- `pnpm --filter @876/api lint`
- `cd apps/billing-api && python -m mypy domains/billing/workflows/customer_sync.py && python -m pytest tests/test_customer_sync.py -q && python -m ruff check domains/billing/workflows/customer_sync.py`

## Do NOT touch (these are handled separately in Phase 1b)

- Any `apps/*/src/lib/auth/**` (session guards).
- `deleteOrganization`/`purgeOrganization` in `organizations.service.ts` and
  `deleteUser`/`purgeUser` in `users.controller.ts` — do not change their WorkOS or cascade
  behavior. You only ADD the exported `enqueueCustomerArchive*` functions; wiring them into the
  delete/purge paths is a separate change.
- The billing-api route generation / `generated_routes.py` / `dispatcher.py` — no new route.

Do not commit. The orchestrator stages and commits.
