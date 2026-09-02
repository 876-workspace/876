# Re-home Work workspace provisioning to the operator tier

Phase 2B moved CRM off Work's operator key and onto a scoped integration app key.
That part is correct and stays. But the cutover **deleted** the only caller that
ever created an organization's Work workspace instead of re-homing it, so today
no code path anywhere creates a `work_tenants` row or a `work_app_connections`
row. Every CRM task and reminder call against a fresh organization now fails
`work/tenant-not-found`, and the integration guard can never authorize because
the connection it checks is never written.

This change restores that provisioning at the tier it belongs to. It is a
placement fix, not a redesign — the callee already exists and is already tested.

## The exact hole

Deleted, in `apps/crm-api/src/modules/tenants/tenants.service.ts::ensure`:

```ts
const work = await workClient().workspace.ensure(organizationId)
if (work.error) return getError('crm/work-unavailable')
```

Nothing replaced it. Confirm for yourself before starting:

```bash
grep -rn "workspace.ensure\|ensureCrm" --include=*.ts apps packages | grep -v node_modules
```

You will find `createWorkWorkspaceClient().ensure` and `.ensureCrm` in
`packages/work/src/workspace.ts` with **zero callers**, and
`apps/work-api/src/modules/tenants/tenants.service.ts::ensure(organizationId, appId?)`
already creating the tenant and, when `appId` is given, CRM's scoped connection
through `ensureCrmConnection`. The callee is built. Only the caller is missing.

## Where it goes, and why — this is decided, do not relitigate

**`apps/api` (the core identity/platform service) becomes the caller.**

Per `.claude/rules/access-tiers.md`, `POST /v1/tenants` on work-api is operator
tier: preparing an organization's Work workspace is 876 acting as the platform,
without any organizational grant. CRM must not hold Work's operator key — that
is the whole point of Phase 2B, and a test greps `apps/crm-api` to keep it out.
Core legitimately holds operator credentials for 876's own platform services.

Per `.claude/rules/workspace-control-plane.md`, this is organization control
plane, not resource data — so it goes on the `workspace` facade in
`apps/api/src/services/workspace.ts`, beside `workspace.finance.ensure`.

**Copy the embedded-finance precedent's shape, not its machinery.** Finance goes
through an outbox and a delivery barrier because Billing provisioning is
asynchronous and multi-step. Work provisioning is one idempotent synchronous
POST. Do not build an outbox for it.

## What to build

### 1. `workspace.work.ensure` — `apps/api/src/services/workspace.ts`

```ts
work: {
  /** Prepare an org's Work workspace and each Work-dependent app's connection. */
  ensure(params: { organizationId: string; appIds?: string[] }): Promise<void>
}
```

Reads `WORK_API_URL` and `WORK_INTERNAL_KEY` through core's existing config
module (`apps/api/src/config/`) — **not** `process.env` at the call site; that
is an `express-api.md` rule. Both are new keys for `apps/api`: add them to
`apps/api/.env.example`, marked `# optional — unset disables Work provisioning`,
and to the config schema.

Behaviour:

- For each app id in scope that is Work-dependent, call
  `POST {WORK_API_URL}/v1/tenants` with `{ organizationId, appId }` and the
  `x-internal-key` header, through `create876WorkOperatorClient` from
  `@876/work/operator`. Do not hand-roll a `fetch`; add `@876/work` as a
  dependency of `@876/api` if it is not already one.
- The route is idempotent, so a re-run is a no-op that returns the existing
  tenant and leaves the stored connection scopes alone.
- **When `WORK_API_URL` or `WORK_INTERNAL_KEY` is unconfigured, skip and log
  `work_provisioning.not_configured` at warn — do not throw.** Rationale: a Work
  outage or an unconfigured local environment must not strand an organization
  that is otherwise fully provisioned. This mirrors
  `finance-provisioning-configuration.ts`, which skips when finance provisioning
  is disabled. An organization whose Work workspace is missing is repaired the
  next time app activation runs, because activation is self-healing (below).
- A Work call that fails for any other reason logs `work_provisioning.failed`
  at error with `organization_id` and `app_id`, and does not throw. Same
  rationale — and unlike finance, no CRM read has been made to depend on it
  succeeding synchronously.

### 2. Which apps are Work-dependent

Finance derives this from a published provisioning-profile column
(`financeDependency`). Work has no such column, and adding one is a core schema
change that is **out of scope here**.

Declare it as a code constant beside `DEFAULT_ORG_APP_SLUGS` in
`apps/api/src/services/provisioning.ts`:

```ts
/**
 * Apps whose modules are backed by the shared Work service (ADR-019).
 *
 * A code constant rather than a provisioning-profile column because exactly one
 * app depends on Work today. Promote this to a `workDependency` profile column
 * when a second app needs it — the resolution point stays the same either way.
 */
export const WORK_DEPENDENT_APP_SLUGS = ['876-crm'] as const
```

Resolve slugs to app ids with the repository helper the subscription code
already uses; intersect with the app ids in scope. An app id that does not
resolve is skipped with a warn log, never a throw.

### 3. Two call sites, both of which already exist for finance

- **`apps/api/src/services/organization-bootstrap.ts`**, immediately after
  `deps.workspace.finance.ensure({ organizationId })` at line ~298. Same
  ordering rationale: the durable owner membership exists by then.
- **`apps/api/src/modules/organizations/organizations.service.ts`**, immediately
  after the `ensureAppReady(...)` call in the subscription-activation path
  (~line 1223). Read the comment above that call — it explains that readiness
  runs on every activation precisely so an org whose workspace was never opened
  is repaired by activating again. Work inherits exactly that property, and it
  is what makes the skip-on-outage behaviour above safe.

Scope the activation-site call to the single app being activated
(`appIds: [app.id]`), so one app is never delayed by another's provisioning.

### 4. Leave CRM alone

`apps/crm-api` gets no new dependency, no new env var, and no Work operator
credential. Do not re-add the deleted block. Do not weaken or delete the test
that greps `apps/crm-api` for `WORK_INTERNAL_KEY`.

`workClient()` in `apps/crm-api/src/providers/work.ts` stays on the integration
client exactly as Phase 2B left it.

### 5. Drop the dead `ensureCrm`

`packages/work/src/workspace.ts` gained `ensureCrm(organizationId, appId)`
alongside `ensure(organizationId)`. They post to the same route with the same
body shape; the second exists only because the first was not updated. Collapse
them into one method:

```ts
ensure(organizationId: string, appId?: string)
```

which omits `appId` from the body when it is not given, and delete `ensureCrm`.
Two names for one route is the "second permanent path" that
`workspace-control-plane.md` forbids.

## Tests — per `.claude/rules/testing.md`

In `apps/api`:

- `workspace.work.ensure` posts `{ organizationId, appId }` for a Work-dependent
  app — assert the exact body and the exact header, with
  `toHaveBeenCalledWith`.
- It does **not** post for an app that is not Work-dependent — assert
  `not.toHaveBeenCalled()`.
- With `WORK_API_URL` unset it skips, logs `work_provisioning.not_configured`,
  and does not throw. Same for an unset `WORK_INTERNAL_KEY`.
- A Work error result logs `work_provisioning.failed` and does not throw; assert
  the surrounding provisioning still completes.
- A network rejection is handled the same way — no unhandled rejection.
- Organization bootstrap reaches Work exactly once for a Work-dependent app,
  after the finance barrier — assert call ordering.
- Subscription activation reaches Work with `appIds: [app.id]` only.
- Activating a Work-dependent app twice is idempotent from core's side — the
  second call still posts (the route is the idempotent party), and nothing
  throws.

In `packages/work`:

- `ensure(organizationId)` posts a body with no `appId` key at all — assert with
  `toEqual`, not a partial match, so an `appId: undefined` regression is caught.
- `ensure(organizationId, appId)` posts both fields.
- Assert `ensureCrm` is gone by the absence of any reference; do not leave a
  test asserting a deleted symbol.

Do not weaken or delete an existing test. No `eslint-disable`. No `as any` —
use `as unknown as T` where a deliberate type violation is needed in a test.

## Rules

- Do not commit. Leave the work in the tree.
- Do not run migrations. This change needs none — say so if you think it does.
- Do not rename an existing route, table, column, env var, or error code.
- Do not read `process.env` outside `apps/api/src/config/`.
- Do not add a `workDependency` schema column; that is deliberately deferred.

## Verification — run these, in the foreground, and report real output

```
pnpm --filter @876/work     typecheck && pnpm --filter @876/work     lint && pnpm --filter @876/work     test
pnpm --filter @876/api      typecheck && pnpm --filter @876/api      lint && pnpm --filter @876/api      boundaries && pnpm --filter @876/api      test
pnpm --filter @876/work-api typecheck && pnpm --filter @876/work-api test
pnpm --filter @876/crm-api  typecheck && pnpm --filter @876/crm-api  test
pnpm check:env
```

Report the counted number of `it()` cases added per file, every file changed and
why, anything you could not verify, and anything deliberately left out.
