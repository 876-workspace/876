# Brief — migrate Console off the `$876` mega-facade

Model: `gpt-5.6-sol`, `model_reasoning_effort=medium`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, commit, rebase, merge, or open a PR).

## Context

ADR `docs/architecture/020-bounded-service-clients-and-application-bffs.md`
replaces the repository-wide `$876` facade with explicit bounded clients.
CRM is already migrated and is the reference. Console is the last large host.

Console's eight bounded composition roots **already exist** and are correct:

```
apps/console/src/lib/services/platform.ts    → platform    (876 operator plane, Core)
apps/console/src/lib/services/workspace.ts   → workspace   (organization plane, Core)
apps/console/src/lib/services/crm.ts         → crm
apps/console/src/lib/services/work.ts        → work
apps/console/src/lib/services/billing.ts     → billing
apps/console/src/lib/services/couriers.ts    → couriers
apps/console/src/lib/services/storage.ts     → storage
apps/console/src/lib/services/widgets.ts     → widgets
```

Each exports a module singleton plus a `create<Domain>(requestId)` factory. Use
the singleton for ordinary reads and the factory where the existing code
propagates a request id.

**188 Console files** import `@/lib/876`; there are roughly **250** `$876.<resource>`
call sites across **34 distinct resources**. Console currently typechecks clean
and its test suite is **127 files / 1325 tests, all passing** — that is the
number your work has to preserve.

## What to do

Replace every `$876.<resource>.<verb>()` with `<domain>.<resource>.<verb>()`
from the owning root, and delete `apps/console/src/lib/876/` once nothing
imports it.

### Deciding the owning domain

`packages/client/src/resource-manifest.ts` is the authoritative
resource → owning-service map for the six product services (82 entries, each
with a `meaning` string). Use it. It marks Core-owned resources as `core`, which
this migration splits in two:

- **`platform`** — 876 acting on itself, across organizations, with no
  organization in the path: the user directory, the app registry, platform
  feature flags, API keys, sessions, devices, auth attempts, reserved usernames,
  audit events, communications, entitlement plans and prices.
- **`workspace`** — one organization's own configuration: memberships, the
  member directory, departments, employees, roles, invites, app assignments and
  app roles, modules, org features, entitlements, onboarding, provisioning.

Both roots expose `organizations`, and some resources are genuinely reachable
from either. The tie-breaker is **what the screen is doing**, not which client
happens to have the method: a cross-organization list or a platform-admin
mutation is `platform`; anything scoped to one organization's own configuration
is `workspace`. Apply it consistently and **record every judgement call in your
report** — that list is the main thing a reviewer will read.

Two mappings are known to be non-obvious; confirm each against the manifest
before you touch it and state your conclusion:

- `customerProfiles` was the facade's projection of **CRM**'s `customers`
  resource (`packages/client/src/composers/console.ts:62`). Console also uses a
  separate `customers`, which is **Billing**'s. They are different resources with
  colliding names — this collision is precisely why the facade is being removed.
  Get them right; conflating them is a data-exposure bug, not a typo.
- `billingAccounts` and `subscriptions` exist on both the Core and Billing sides.
  Decide per call site by which service actually owns the record being read.

### Types

Console imports contract types from `@876/admin` in roughly 160 files. Those
types now live in `@876/platform`. Move each type import to the package that
owns the resource the type describes — `@876/platform`, `@876/workspace`,
`@876/crm`, `@876/billing`, and so on — not to whichever package happens to
re-export it. Check what each package's entrypoints actually export before you
assume a name is available, and report anything you could not source cleanly.

### Also

- `apps/console/package.json` and `next.config.ts` already declare `@876/crm`,
  `@876/platform`, `@876/storage`, `@876/work` and `@876/workspace`. Add any further one you genuinely need, in both places.
- Console's route handlers keep `requireConsolePermission(...)` **before** the
  facade call, and keep their existing audit writes. The client swap must not
  move, weaken, or remove either. A Console screen still authorizes locally
  before calling a product operator client.

## Hard "do not"

- Do not create a new aggregating object — no `services`, no `clients`, no
  `$876` replacement, no barrel that re-exports several domains. A module that
  genuinely spans domains imports several roots; that explicit dependency is the
  point of the architecture.
- Do not change any request path, credential, auth tier, permission check, or
  audit call.
- Do not touch `apps/crm/**`, `apps/enterprise/**`, `apps/876/**`, `apps/billing/**`, `apps/invoice/**`, `apps/couriers/**`, or anything under `packages/**`. Two other agents are migrating those in parallel right now.
- Do not hand-edit `pnpm-lock.yaml`. If a manifest changes, run `pnpm install --no-frozen-lockfile` — and if another agent is mid-install, wait and retry rather than running two at once.
- Do not add `eslint-disable`, and do not use `as any` (`as unknown as T` only, with a comment).
- Do not delete or skip a test. If a test mocks `@/lib/876`, re-point the mock at
  the specific root the code under test now uses — do not delete the assertion.
- Do not weaken a production signature to make a test easier.

## Work in phases, verifying each before starting the next

1. `platform` resources.
2. `workspace` resources.
3. CRM, Work, Billing, Couriers, Storage, Widgets.
4. Type imports off `@876/admin`.
5. Delete `apps/console/src/lib/876/`, and drop `@876/client`, `@876/sdk`, and
   `@876/admin` from `apps/console/package.json` and `next.config.ts` **only if**
   nothing in Console still imports them.

## Verification — foreground, after every phase and again at the end

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
npx prettier --check "apps/console/**/*.{ts,tsx}"
grep -rn "@876/client\|@876/sdk\|@876/admin\|lib/876" apps/console/src apps/console/next.config.ts
```

Typecheck must be **0 errors**. The test suite must still report **127 files /
1325 tests passing** — fewer tests is a failure, not a pass. After phase 5 the
grep must return nothing.

## Report

Write `.claude/reports/codex/2026-08-30-console-bounded-client-migration.md`:
the full resource → domain mapping you applied; every judgement call and its
reasoning; the `customerProfiles` / `customers` and `billingAccounts` /
`subscriptions` resolutions specifically; every type import you could not source
cleanly; test counts before and after; the verbatim output of each verification
command; and anything left unmigrated with the reason.
