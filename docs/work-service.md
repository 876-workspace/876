# 876 Work service — foundation, migration, and runbook

The architectural decision, the ownership model, and the calendar standards live in
`docs/architecture/019-work-service-and-productivity-plane.md`. This file is the
operational half: what exists today, how to bring it up, how to migrate CRM's data
into it, and what is deliberately not done yet.

## What exists

| Piece            | Path                                 | Role                                                        |
| ---------------- | ------------------------------------ | ----------------------------------------------------------- |
| Contract package | `packages/work`                      | Zod contracts + typed resources. Root entry is browser-safe |
| Operator client  | `packages/work/src/operator.ts`      | `server-only`; constructs the privileged client             |
| Service          | `apps/work-api`                      | Express 5 + Prisma 7, port 4020, its own Neon project       |
| CRM adapter      | `apps/crm-api/src/providers/work.ts` | Builds the Work client and the CRM request context          |

The Work API exposes, all behind `x-internal-key`:

```
POST   /v1/tenants
GET    /v1/organizations/:organizationId/tasks
POST   /v1/organizations/:organizationId/tasks
PATCH  /v1/organizations/:organizationId/tasks/:taskId
DELETE /v1/organizations/:organizationId/tasks/:taskId
        …and the identical reminder set
```

CRM's own URLs are unchanged. `/v1/organizations/:organizationId/requests/:requestId/tasks`
still validates the CRM request, still returns `object: "request_task"`, and still
enriches the CRM priority — it just stores in Work now.

## Environment

```
WORK_DATABASE_URL          Neon pooled URL for the work database
WORK_DIRECT_DATABASE_URL   Neon direct URL — migrations only
WORK_INTERNAL_KEY          the operator credential
WORK_API_URL               http://localhost:4020 locally
```

`WORK_API_URL` and `WORK_INTERNAL_KEY` are also read by `apps/crm-api`. Both are
declared in the `.env.example` of each app that reads them, so `pnpm check:env` can
see them; `pnpm check:database-env work-api` verifies the two database URLs.

Work runs its **own Neon project**, like every other 876 datastore. Do not add a
`work` database to the CRM project — the isolation is the point of the boundary.

## Schema notes

Two things about `apps/work-api/prisma/` are deliberate and easy to undo by accident:

- **The context columns carry a CHECK constraint** enforcing that
  `context_service`, `context_resource`, and `context_id` are either all null or all
  set. Prisma cannot express this, so it lives only in the migration SQL and Prisma
  will not recreate it if the migration is ever regenerated from the schema. Keep it —
  it makes a half-built context unrepresentable rather than merely handled.
- **Index names are truncated to Postgres's 63-byte identifier limit** to match the
  names Prisma itself derives. The two context indexes would otherwise be 86 and 82
  characters; Postgres truncates silently and to a _different_ string than Prisma
  expects, which produces permanent, unfixable-looking migration drift.

## Bring-up

```bash
pnpm --filter @876/work-api db:deploy      # apply the committed schema
pnpm dev:work                              # or pnpm dev:crm, which starts Work too
```

`dev:crm`, `dev:crm:api`, `dev:console`, and the combined dev scripts all start Work,
because CRM's task and reminder endpoints now depend on it.

## Migrating CRM's existing tasks and reminders

The strategy is **copy → verify → cut over → observe → drop later**. It is not
"drop the CRM tables and hope".

```bash
pnpm --filter @876/work-api migrate:crm    # copy CRM rows into Work
pnpm --filter @876/work-api verify:crm     # strict parity; must pass before cutover
```

The migration preserves the **existing CRM ids** (`crm_task_…` stays `crm_task_…`),
so URLs, logs, Sentry breadcrumbs, and API consumers keep resolving. Only
Work-created rows get Work-native prefixes.

`verify:crm` is not a row count. It compares every migrated row field by field and
fails on a missing id, an unexpected CRM-context row in Work, or a mismatch in tenant,
context, status, timestamps, payload, completion metadata, or tombstone state. **Do
not cut over on a failing verifier.**

Two properties of the verifier follow from it being a _pre-cutover_ gate, and both
are deliberate:

- It treats a CRM-context Work row with no CRM counterpart as a failure
  (`unexpectedInWork`). After cutover that is the normal state — new tasks are created
  in Work and never reach the legacy tables — so **the verifier is meaningful only
  before the runtime cuts over.** Do not run it afterwards and read the failure as
  data loss.
- It asserts the Work tenant's status equals the CRM tenant's, and the migration
  writes CRM's status onto the Work tenant on every run. During the foundation the
  Work tenant's lifecycle is derived from CRM's; it becomes independent in Phase 2,
  at which point both halves of this pairing have to change together.

### The rollback limitation — read this before deploying

The foundation deliberately does **not** dual-write. After cutover, a CRM task write
lands in Work and nowhere else. The retained `RequestTask` / `RequestReminder` tables
are migration checkpoints, **not hot replicas**.

So rolling the CRM binary back to the pre-Work implementation after production has
accepted Work-backed writes will silently expose stale data. A real rollback needs the
Work delta copied back into the CRM tables first, or another explicitly designed path.
Plan for forward-fix, not rollback.

### Legacy tables stay, for now

`RequestTask` and `RequestReminder` are not dropped in this change. Drop them only
after: Work is deployed, the migration verified, the application exercised, telemetry
clean, and no runtime importer of the CRM task/reminder repositories remains. That is
the end of the migration, not the beginning.

## Verification

```bash
pnpm --filter @876/core     typecheck && pnpm --filter @876/core     test
pnpm --filter @876/work     typecheck && pnpm --filter @876/work     lint && pnpm --filter @876/work     test
pnpm --filter @876/work-api typecheck && pnpm --filter @876/work-api lint && pnpm --filter @876/work-api test
pnpm --filter @876/crm-api  typecheck && pnpm --filter @876/crm-api  lint && pnpm --filter @876/crm-api  test
pnpm check:service-bundle
pnpm check:database-env crm-api work-api
pnpm format:check
```

`check:service-bundle` matters more than it looks: the Express services are bundled
with `tsup`, and `@876/*` workspace packages ship TypeScript source. A runtime
workspace dependency missing from `noExternal` produces a deployed bundle that still
`import`s `@876/work` and dies with `ERR_MODULE_NOT_FOUND` at boot — a green build and
a broken service. `apps/work-api` and `apps/crm-api` both inline `@876/core` and
`@876/work`.

### Manual smoke test after migration

In CRM, against a real request: view / create / edit / complete / reopen / delete a
task, then the same for reminders, then repeat through Console. Confirm the rows land
in the Work database and that **no new writes** reach the legacy CRM tables.

## Known gaps in the foundation

These are tracked in the architecture record and are Phase 2 work, in order:

1. **CRM authenticates to Work with the operator key.** A product app holding an
   operator credential is the deviation to close first (Phase 2B: the Work integration
   tier, org-scoped, with named scopes).
2. Context is a single triple rather than a collection of links.
3. `assigneeId` is a column rather than a first-class assignment resource.
4. No `startAt`, no task lists, no calendars, no events, no recurrence, no alerts.
5. No standalone Work product surface — by design; Work is a service first, and the
   reusable widgets come before any standalone app.
