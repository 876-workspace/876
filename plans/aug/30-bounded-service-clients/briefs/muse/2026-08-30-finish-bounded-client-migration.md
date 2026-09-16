# Brief — finish the bounded service client migration

Branch: `refactor/bounded-service-clients`, already checked out. **Do not create a
branch, commit, rebase, merge, or open a pull request.** Leave everything in the
working tree.

## Read this part first — it changes how you must work

**You cannot run any command in this container.** Your bash tool is sandboxed
through bubblewrap, and `bwrap` cannot create a namespace here, so every
`pnpm typecheck`, `pnpm test`, `pnpm lint`, `prettier`, and `pnpm install` you
attempt will fail. This is a known environment limitation, not something you can
work around.

Consequences you must accept and work within:

1. **You will write this code blind.** The orchestrator runs every check.
2. **Never write that a check passed.** Write "not executed; verification is the
   orchestrator's" instead. A truthful "not executed" is worth far more than a
   confident claim, and a fabricated result is the single most damaging thing you
   could produce here.
3. **Read more than you normally would before editing.** You cannot lean on a
   compiler to catch a wrong symbol name, so verify every import against the
   package's `exports` map in its `package.json` and against the actual source
   file it points at.
4. **Prefer stopping over guessing.** If you cannot determine the correct owning
   domain or authority for a call, leave it, and list it in your report. A
   wrong domain is a data-exposure bug; an unfinished file is just unfinished.

## The architecture

Read `docs/architecture/020-bounded-service-clients-and-application-bffs.md`
first. It is the accepted decision.

The repo-wide `$876` mega-facade (`@876/client`) is being replaced by explicit
bounded clients, one per owning domain, with the entrypoint naming the **caller
principal** rather than the credential:

| Root                                                                                     | Owns                                                                                  | Typical entrypoint                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `@876/account`                                                                           | the signed-in 876 Account: auth, current user, sessions, OAuth grants, mobile numbers | `@876/account`                                           |
| `@876/workspace`                                                                         | one organization's own data                                                           | `/session` (user authority), `/operator` (876 authority) |
| `@876/platform`                                                                          | 876 operator plane, cross-organization                                                | `/operator`                                              |
| `@876/crm`, `@876/work`, `@876/billing`, `@876/couriers`, `@876/storage`, `@876/widgets` | product domains                                                                       | `/service`, `/operator`, `/integration`, `/session`      |

Each host composes only the clients it needs under its own `src/lib/services/`,
one file per domain. **There is no replacement aggregator** — no `services`
object, no `clients` barrel, no new `$876`-shaped thing. A module spanning
domains imports several roots; that explicit dependency is the point.

### The fifth client that is NOT part of this migration

`@876/core/platform` (`packages/core/src/platform/index.ts`) is a narrow,
server-only platform bootstrap client. It is **already bounded, is not being
deleted, and must be left alone.** It is the current and correct home of:

- geo — `countries.list()`, `regions.list(countryCode)` (`packages/core/src/platform/resources/geo.ts`);
- organization bootstrap — `POST /organizations/bootstrap` (`packages/core/src/platform/resources/orgs.ts:29`).

Two earlier agents wasted an entire run each by hunting for these on
`@876/workspace` / `@876/platform`, not finding them, and declaring themselves
blocked. **They are not there by design, and their absence is not a blocker.**
Where an app has a `platform-client.ts` using `@876/core/platform`, keep its
contents byte-for-byte and only move the file to `src/lib/services/platform.ts`.

### Client lifetime

- **Lazy module singleton** when the credential is static (a server API key).
  It must construct on **first use**, never at module scope: OpenNext imports
  every route module during the Cloudflare build, when runtime secrets are
  deliberately absent, so reading a secret at module scope fails the build.
- **Request-scoped factory** when authority belongs to one request (a signed-in
  user's access token, an active organization).
- Never a lazy `Proxy` to hide a lifecycle mistake.

**The finished reference implementations — read these before writing anything:**

```
apps/crm/src/lib/services/crm.ts             lazy singleton, static server credential
apps/crm/src/lib/services/workspace.ts       request-scoped, signed-in user's bearer token
apps/console/src/lib/services/*.ts           eight operator roots (already correct)
apps/enterprise/src/lib/services/*.ts        account / account-server / workspace split
```

## Verified state — this is where the work actually stands

Four earlier agents ran in parallel and three were cut off mid-flight when the
Codex quota ran out. Everything below was measured by the orchestrator just now;
trust it over anything you infer.

| Area                             | State                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/crm`                       | Migrated. **7** stale imports of `@/lib/876/platform-client` remain.                                                                                                             |
| `apps/enterprise`                | Migrated; `src/lib/876/` already deleted. **19** `@876/sdk` imports remain.                                                                                                      |
| `apps/876`                       | Migrated. **3** `@876/sdk` imports remain.                                                                                                                                       |
| `apps/billing`                   | Migrated. **1** `@876/sdk` import remains.                                                                                                                                       |
| `apps/console`                   | **Half migrated, and currently typechecks clean at 0 errors.** 106 files converted; **163** `@/lib/876` imports and **164** `@876/admin` type imports remain, across ~301 files. |
| `apps/invoice`                   | **Not started.** Still on `@876/client/server`.                                                                                                                                  |
| `apps/couriers`                  | **Not started.** ~79 files still reference the facade.                                                                                                                           |
| Rules + `CLAUDE.md`              | Mostly done. **22** stale references remain across 6 files.                                                                                                                      |
| `packages/sdk`, `packages/admin` | Already reduced to five one-line re-export shims over `@876/account` / `@876/platform`.                                                                                          |

## Your phases, in this order

### Phase 1 — the four small leftovers (do this first; it is quick and low risk)

1. **`apps/crm`** — `git mv apps/crm/src/lib/876/platform-client.ts` to
   `apps/crm/src/lib/services/platform.ts`, update the 7 importers, remove the
   now-empty `src/lib/876/` directory. Contents of the moved file are unchanged.
2. **`apps/enterprise` (19), `apps/876` (3), `apps/billing` (1)** — these are
   `@876/sdk` **type** imports. `@876/sdk` is now a shim over `@876/account`.
   Repoint each to `@876/account`, but **check the symbol is actually exported
   from the `@876/account` root** (`packages/account/src/index.ts`) before you
   change it. The account root deliberately dropped ~52 symbols that the old SDK
   root had; those still live at `@876/account/compat`. If a symbol is only on
   `compat`, use `@876/account/compat` and note it in your report — do not
   invent an export.

**`apps/876` carries one deliberate exception you must preserve exactly:**
`apps/876/src/lib/auth/guards.ts` uses an internal-key admin client for session
bootstrap only. Keep it server-only, do not widen it, do not move it into a
shared root, and do not let browser code reach it.

### Phase 2 — finish `apps/console`

Console is the largest piece. It is currently consistent, so **work in small
coherent groups and keep it consistent** — a half-converted file is worse than
an unconverted one.

The eight roots already exist at `apps/console/src/lib/services/`:
`platform`, `workspace`, `crm`, `work`, `billing`, `couriers`, `storage`,
`widgets`. Each exports a module singleton plus a `create<Domain>(requestId)`
factory. Use the singleton for ordinary reads and the factory where the existing
code threads a request id.

**Resource → domain.** `packages/client/src/resource-manifest.ts` is the
authoritative map for the six product services — 82 entries, each with a
`meaning` string. Use it. It marks Core-owned resources as `core`, which splits
in two here:

- **`platform`** — 876 acting on itself, across organizations, no organization in
  the path: user directory, app registry, platform feature flags, API keys,
  sessions, devices, auth attempts, reserved usernames, audit events,
  communications, entitlement plans, prices.
- **`workspace`** — one organization's own configuration: memberships, member
  directory, departments, employees, roles, invites, app assignments, app roles,
  modules, org features, entitlements, onboarding, provisioning.

The tie-breaker is **what the screen is doing**, not which client happens to have
the method. A cross-organization list or a platform-admin mutation is `platform`;
anything scoped to one organization's own configuration is `workspace`.

These are the resources still on `$876` in Console, with counts, most of the
easy ones having already been done:

```
features 22   paymentMethods 10   memberships 7   uploads 6   billingAccounts 6
organizationMembers 5   invites 5   customers 5   notes 4   collections 4
requests 3   files 3   customerProfiles 2   appSubscriptions 2
roles 1   prices 1   plans 1   organizations 1   employees 1
```

**Two name collisions you must get right — conflating them is a data-exposure
bug, not a typo:**

- `customerProfiles` was the facade's projection of **CRM**'s `customers`
  resource (`packages/client/src/composers/console.ts:62`). It becomes
  `crm.customers`.
- `customers` in Console is **Billing**'s customer registry. It becomes
  `billing.customers`.
- `billingAccounts` and `appSubscriptions` exist on both the Core and Billing
  sides. Decide per call site by which service actually owns the record being
  read, and state your reasoning per call site in the report.

**Types.** The 164 `@876/admin` type imports move to the package that owns the
resource the type describes — `@876/platform`, `@876/workspace`, `@876/crm`,
`@876/billing` and so on — not to whichever package happens to re-export it.
Check each package's `exports` map and source before assuming a name is
available. `@876/platform/compat` carries the historical `@876/admin` root
surface if a symbol is not on the bounded root.

**Preserve exactly:** `requireConsolePermission(...)` before every facade call,
and every existing audit write. Console authorizes locally before calling a
product operator client. This is a client swap, not a behaviour change — no
request path, credential, auth tier, guard, or audit call may change.

Delete `apps/console/src/lib/876/` only when nothing in Console imports it.

### Phase 3 — `apps/invoice` and `apps/couriers`

Neither has been started. Both are authority-sensitive.

> **Never replace a user-scoped or organization-scoped call with an
> operator/internal-key client because it is more convenient.** Both apps
> deliberately avoid holding privileged credentials. Downgrading that is a silent
> privilege escalation that no test will catch.

**`apps/invoice`** uses **both** Billing boundaries today, and both must survive:

- `apps/invoice/src/lib/876/billing-integration.ts` already uses
  `@876/billing/integration` with `INVOICE_API_876_KEY`. Leave that authority as
  it is; only move the file to `src/lib/services/`.
- `apps/invoice/src/lib/876/index.ts` binds the Billing **tenant** transport to
  the caller's access token. That moves to the `@876/billing` **root**
  entrypoint (`create876Client` from `packages/billing/src/client.ts`), which is
  the tenant client and the only one carrying `quotes`. Invoice's quote page
  keeps `GET /api/v1/quotes` at tenant authority.
- Do **not** force tenant calls onto `@876/billing/integration` — that boundary
  has no `quotes` resource (`packages/billing/src/integration/resources/`
  contains none). An earlier agent stalled on exactly this; the answer is the
  tenant root.
- `apps/invoice/src/lib/876/platform-client.ts` uses `@876/core/platform` — move
  the file, keep the contents.
- Keep `billing-config.ts` working and move its test with it, keeping every
  assertion.

**`apps/couriers`** composes four domains at three authorities. Split into one
file per domain under `src/lib/services/`:

| Today                                        | Becomes                                        | Authority to preserve                 |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `create876CouriersAdminClient`               | `@876/couriers/operator`                       | server-only internal key              |
| `create876BillingIntegrationClient`          | `@876/billing/integration`                     | org-scoped connection + scopes        |
| `create876StorageClient`                     | `@876/storage/service`                         | server-only                           |
| `createWidgetsClient`                        | `@876/widgets/service`                         | member/service transport as today     |
| `create876ServerClient` (access-token-bound) | `@876/workspace/session` and the product roots | **request-scoped**, never a singleton |

`apps/couriers/src/lib/876/platform-client.ts` uses `@876/core/platform` — move
the file, keep the contents. `apps/couriers/src/lib/geo/resolve-region.ts`
already calls geo through it and needs no change beyond the import path.

Do not touch `apps/couriers/src/lib/reserved-slugs.ts` or its test.

### Phase 4 — the last 22 rule references

Six files still carry stale references:

```
.claude/rules/workspace-control-plane.md   7
CLAUDE.md                                  6
.claude/rules/sdk-conventions.md           5
.claude/rules/data-fetching.md             2
.claude/rules/shared-product-ui.md         1
.claude/rules/api-access.md                1
```

`.claude/rules/` is canonical; every rule file also exists at
`.agents/rules/<same-name>` and the two must stay byte-identical. `CLAUDE.md`
exists only at the repo root. `.grok/rules/` no longer exists — do not create it.
Do not touch `.claude/rules/cli.md`.

A surviving `$876` mention is correct **only** where it means the Account client.
Leave those, and list them in your report.

## What you must NOT do

- **Do not delete `packages/client`, `packages/sdk`, or `packages/admin`.** The
  orchestrator does that last, after verifying nothing imports them. Deleting
  them blind would break the build in a way you cannot detect.
- Do not touch `packages/**` at all, other than reading it.
- Do not add `eslint-disable`; do not use `as any` (use `as unknown as T` only,
  with a comment saying why).
- Do not delete or skip a test. If a test mocks `@/lib/876`, re-point the mock at
  the specific root the code under test now uses and keep every assertion.
- Do not weaken a production signature — an optional `searchParams`, a removed
  toolbar, a loosened guard — to make anything easier.
- Do not hand-edit `pnpm-lock.yaml`. If you change a `package.json`, say so in
  your report so the orchestrator runs the install.
- When you add a dependency to an app's `package.json`, add the matching
  `transpilePackages` entry in that app's `next.config.ts` in the same edit.
  These packages ship raw TypeScript; a missing entry does not fail the build, it
  fails in the browser at runtime as `Element type is invalid`.

## The checks the orchestrator will run against your work

Write code that survives these. You cannot run them.

```bash
pnpm install --no-frozen-lockfile
pnpm -r --no-bail typecheck
pnpm -r --no-bail test
npx prettier --check "apps/**/*.{ts,tsx}"
grep -rn "@876/client\|@876/sdk\|@876/admin\|lib/876" apps/*/src apps/*/next.config.ts
grep -rn "eslint-disable\|as any" <every path you touched>
```

Known-good baselines to preserve — a green suite with fewer tests is a failure:

| Suite             | Files / tests |
| ----------------- | ------------- |
| `apps/console`    | 127 / 1325    |
| `apps/crm`        | 27 / 213      |
| `apps/enterprise` | 18 / 358      |
| `apps/invoice`    | 10 / 118      |
| `apps/couriers`   | 72 / 766      |
| `apps/876`        | 5 / 30        |
| `packages/core`   | 35 / 941      |

Pre-existing failures on `main`, **not yours to fix**: `apps/api` 4,
`apps/couriers-api` 2, and `.claude/rules/access-control.md` failing
`prettier --check`.

## Report

Write `.claude/reports/muse/2026-08-30-finish-bounded-client-migration.md`
containing, per phase:

- every file changed, with a one-line reason;
- **the full resource → domain mapping you applied in Console**, and your
  reasoning for every judgement call, especially `billingAccounts` and
  `appSubscriptions` per call site;
- the `customerProfiles` → `crm.customers` and `customers` → `billing.customers`
  resolutions, confirmed;
- every symbol you had to source from `@876/account/compat` or
  `@876/platform/compat` rather than a bounded root, and why;
- every `package.json` / `transpilePackages` entry you added;
- anything you left unmigrated, with the reason;
- an explicit statement that **no verification command was executed**, because
  you cannot execute one in this container.

Do not estimate or infer test results. Do not write "should pass".
