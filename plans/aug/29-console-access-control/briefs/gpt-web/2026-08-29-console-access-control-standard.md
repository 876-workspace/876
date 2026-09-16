# Brief — Console Access Control, and the platform-wide RBAC/UI-gating standard

**Delegate:** ChatGPT web (GPT‑5.6, high reasoning)
**Branch:** `feat/console-access-control` (already exists on GitHub, cut from `main` @ `3c6aabd5`)
**Repo:** `876-workspace/876`
**Date:** 2026-08-29
**Orchestrator:** Claude Code (reviews, verifies, runs migrations, commits corrections)

---

## 0. YOUR OPERATING RULES — read these first, they are absolute

You are being used as a **code writer only**. A separate agent (Claude Code) owns
the repository, the database, verification, and release. Your job is to execute
this brief by editing files and pushing to the existing branch.

**You MUST:**

1. Work **only** on the branch `feat/console-access-control`. It already exists.
2. Edit / create / delete files, and commit those edits to that branch.
3. Write a completion report to
   `.claude/reports/gpt-web/2026-08-29-console-access-control-standard.md`
   (format in §12). Include it in your final commit.
4. Write **as many tests as the work warrants — err heavily on the side of more.**
   There is no budget constraint on your output. A phase with fewer tests than
   §11 requires is an incomplete phase.
5. Follow the repo's rule files. They are checked in and authoritative. Read at
   minimum, before writing a line:
   - `CLAUDE.md` (root)
   - `.claude/rules/app-structure.md`
   - `.claude/rules/app-layout.md`
   - `.claude/rules/app-access.md`
   - `.claude/rules/access-tiers.md`
   - `.claude/rules/sdk-conventions.md`
   - `.claude/rules/api-access.md`
   - `.claude/rules/feature-flags.md`
   - `.claude/rules/data-loading.md`
   - `.claude/rules/error-handling.md`
   - `.claude/rules/types.md`
   - `.claude/rules/testing.md`
   - `.claude/rules/code-style.md`
   - `.claude/rules/naming.md`

**You MUST NOT:**

- **Do not create, rename, delete, merge, or rebase any branch.** One branch only.
- **Do not open, merge, or comment on a pull request.**
- **Do not touch `main`.**
- **Do not run any shell command, build, test, lint, migration, or database
  operation.** You cannot; do not pretend you did. Never write "tests pass" in
  your report — write "not executed; verification is the orchestrator's".
- **Do not run `prisma migrate`.** Where a schema change is required, edit the
  `.prisma` model **and** hand-write the migration SQL into the exact path this
  brief names. The orchestrator applies it.
- **Do not add `Co-Authored-By`, "Generated with", or any AI attribution** to a
  commit message, commit body, or file. This is a hard repo rule.
- **Do not add `eslint-disable` comments** anywhere, for any reason. A lint rule
  you cannot satisfy is a signal the code is wrong — fix the code.
- **Do not use `as any`.** Use `as unknown as T` only in tests, only for a
  deliberate type violation being tested.
- **Do not add a barrel `index.ts` that re-exports a whole directory** (the two
  sanctioned exceptions are `src/lib/service/index.ts` and a package's declared
  entry point).
- **Do not add a Next.js `proxy.ts` or `middleware.ts`.** The Cloudflare/OpenNext
  build fails outright on those.
- **Do not add a Server Action.** Browser mutations go through a thin route
  handler that authorizes and then calls the facade.
- **Do not reformat files you are not otherwise changing.**

**Commits:** Conventional Commits, `<type>(<scope>): <description>`, imperative,
50–72 chars, one logical change per commit. Do not bundle unrelated files under
a catch-all message. Documentation commits are separate from code commits. Each
phase below should land as several focused commits, not one.

---

## 1. What this work is, in one paragraph

Console is the 876 platform's internal admin application. It has a working
role/permission **catalog** and a working **route guard**, but its **navigation
is completely ungated** — every sidebar item renders for every operator
regardless of role — and its permission vocabulary is defined in a Console-local
file that has already drifted from the platform's canonical catalog format used
by CRM and Couriers. This work fixes Console's access control **and, in doing so,
establishes the one pattern every other 876 app (CRM, Invoice, Billing, Couriers,
and every future product app) will copy**: one catalog format, one effective-
permission resolver, one request-scoped access context, one declarative
permission-annotated navigation registry, and a hard three-layer enforcement
rule. Console is the reference implementation; everything you build must be
shaped so a product app adopts it by declaring a catalog and a nav registry, not
by re-implementing anything.

---

## 2. Ground truth — verified against the live repo and databases on 2026-08-29

Do not re-derive these. They were checked directly.

### 2.1 What already exists and is correct

| Thing                                   | Location                                                                                                                                                                              | State                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical app permission catalog format | `packages/core/src/access/types.ts`, `index.ts`, `catalogs.ts`                                                                                                                        | Working. `defineAppPermissionCatalog`, `resolveEffectivePermissions`, `hasPermission`, `groupByModule`. Catalogs exist for `876-couriers` and `876-crm` only.                                           |
| Core API app-access module              | `apps/api/src/modules/app-access/`                                                                                                                                                    | Full CRUD: `/apps/:app_id/permissions`, `/apps/:app_id/roles`, `/organizations/:org_id/apps/:app_id/roles`, `/organizations/:org_id/app-memberships`, `/organizations/:org_id/apps/:app_id/members/me`. |
| DB models                               | `apps/api/prisma/schema/app-permission.prisma`, `app-role.prisma`, `app-assignment.prisma`, `employee-profile.prisma`                                                                 | Present and migrated.                                                                                                                                                                                   |
| Client surface                          | `packages/admin/src/resources/app-access.ts`; composed at `packages/client/src/composers/control-planes.ts` as `workspace.apps.{permissions,roles,orgRoles,memberships,entitlements}` | Working.                                                                                                                                                                                                |
| Console's own RBAC store                | `apps/console/prisma/schema/role.prisma` (`roles`), `user.prisma` (`Member` → `console_members`)                                                                                      | Working.                                                                                                                                                                                                |
| Console guards                          | `apps/console/src/lib/auth/guards.ts` (`findConsoleAccess`, `requireConsoleAccount`, `requireConsolePermission`), `route-guard.ts` (route-handler variant)                            | Working, `React.cache`-memoized.                                                                                                                                                                        |
| Console feature flags                   | `apps/console/src/lib/features.ts` → `$876.features.admin.evaluate({ appId, userId })`                                                                                                | Working. PostHog evaluates rollout; local governance (kill switch, org/user grants, parent/child) is applied on top.                                                                                    |

### 2.2 What is broken or missing — the actual work

1. **Navigation is ungated.** `apps/console/src/components/shell/nav-config.ts`
   is a flat array of `{ title, href, icon, color }` with **no permission field
   at all**, and `sidebar.tsx` renders all of it. `settings-options.ts` is the
   same. Every operator — including a `staff` read-only member — sees Security,
   Storage, Settings, Reports, Apps, Widgets.
2. **Console's permission vocabulary is a private snowflake.**
   `apps/console/src/lib/permissions.ts` hand-writes `SYSTEM_ROLE_DEFINITIONS`,
   `RESOURCE_READ`, `RESOURCE_WRITE`, and a **separately hand-maintained**
   `PERMISSION_GROUPS` for the role editor. There is **no** console catalog in
   `packages/core/src/access/catalogs.ts`. The two lists have already drifted:
   `PERMISSION_GROUPS` omits `users:delete`, `organizations:delete`,
   `memberships:delete`, `apps:delete`, `roles:create`, `roles:update`,
   `roles:delete`, and `roles:read`/`roles:list` — all of which the `owner` and
   `super_admin` role definitions grant. An operator editing a role in the UI
   therefore **cannot see, and will silently strip, permissions that exist.**
   This is a live defect, not a cosmetic one.
3. **`app_permissions` and `app_roles` are empty in production** (verified: 0
   rows each). The catalogs have never been seeded. `app_assignments` has 4 rows.
4. **The team page has an N+1 and renders orphaned grants as blank rows.**
   `apps/console/src/app/(app)/settings/users/(list)/page.tsx` issues one
   `$876.users.admin.retrieve()` **per member** inside `Promise.all`. When the
   identity lookup fails it falls back to `''`, and `member-row.tsx` renders
   `—` for the name, an empty email cell, and a `?` avatar. **This is why the
   page "renders empty."** (The orchestrator has already deleted the two
   orphaned rows from the database; the rendering weakness remains and must be
   fixed so it cannot recur.)
5. **No `position` / employment context on the team page.** The column shows
   Role only.
6. **No affiliation model.** Console cannot express "this operator is an Efesto
   employee" vs "this operator is an external auditor with a time-boxed grant".

### 2.3 Live data facts (as of 2026-08-29, after repair)

- Console app record: slug **`console`**, id `rap_1fef616d307d41538bfb27b3be07741a`, `app_kind = internal`. **Note the slug is `console`, not `876-console`.**
- `console_members` now holds exactly one row: `user_695d45c54a374ff0a570003e15668891` / `super_admin` / `active`.
- `roles` holds the four system roles: `staff`(14 perms), `admin`(29), `owner`(35), `super_admin`(35).
- Efesto org: `org_fa2cfb0bce834ae6a6537830159e5f14`, slug `efesto`, name "Efesto Technologies, Inc". It has **one** membership: `user_695d45c54a374ff0a570003e15668891`, role `owner`, status `active`.
- `$876.users.admin.list({ ids: string[] })` **exists** (`packages/admin/src/resources/users.ts:106`, serializes to a comma-joined `ids` query param). Use it. There is no excuse for a per-row retrieve.

---

## 3. THE DESIGN DECISIONS — these are settled. Implement them; do not relitigate.

These answer questions that were explicitly asked. Each carries its reasoning so
you can apply the same reasoning to edge cases the brief does not name.

### 3.1 Console access is granted by a Console access grant. Full stop.

A row in `console_members` **is** the authorization to use Console. Nothing else
grants it.

- **Being a member of Efesto Technologies must never imply Console access.**
- **Holding Console access must never require Efesto membership.**

**Why not org-gate Console:** an external auditor, a regulator, a law-enforcement
liaison, or a contracted security reviewer needs a narrow, time-boxed Console
grant. Making them an Efesto org member to achieve that would also hand them
Enterprise-workspace membership, the employee roster, CRM visibility, and every
other entitlement Efesto holds — a far larger grant than intended, and one that
is messy to revoke. Conversely, making org membership a _precondition_ would
make the platform's **most privileged surface** depend on a **less privileged
record** that ordinary HR-shaped flows mutate. Two different lifecycles must not
be collapsed into one gate.

### 3.2 Employment is an _attribute_ of the grant, not the gate

`console_members` gains an **`affiliation`** column with exactly three values:

| `affiliation` | Who                                                                | Membership requirement                                                                          | Expiry       |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------ |
| `staff`       | An Efesto Technologies employee                                    | **Active Efesto membership is verified at guard time.** If it lapses, Console access is denied. | Optional     |
| `contractor`  | Engaged, non-employee, ongoing                                     | Not required                                                                                    | **Required** |
| `external`    | Auditor, regulator, law enforcement, partner, third-party reviewer | Not required                                                                                    | **Required** |

This gives you "offboarding an employee revokes Console automatically" **without
ever making membership the gate**. The `staff` verification is a _deny_ rule
layered on top of the grant — it can only ever withhold access, never widen it.
That direction matters: a verification that can only subtract is safe to fail
open on infrastructure error; one that can add is not.

`contractor` and `external` grants **must** carry `expiresAt` and
`justification`. An expired grant is denied at the guard. This is not optional
and must not be bypassable from the UI.

### 3.3 Account type for external operators

An external auditor uses a **consumer (personal) 876 account**. They are not
acting on behalf of an organization, so they must not be pushed into creating
one. Console's realm handling must accept a consumer-realm session for a member
whose `affiliation` is `contractor` or `external`. (Console is `app_kind:
internal` and is not an org-workspace app, so the org-signup rules in
`.claude/rules/product-org-signup.md` do not apply to it.)

### 3.4 "Position" replaces "Role" on the team page — no, it _joins_ it

The team table shows **both**, because they answer different questions:

- **Position** — what this person _does_ at Efesto. Resolved from the identity
  API's `employee_profiles.job_title` for the person's Efesto membership when
  `affiliation = 'staff'`; otherwise the grant's own free-text `title` (e.g.
  "External Auditor — Grant Thornton"). This is display metadata; it grants
  nothing.
- **Role** — the Console role that determines permissions. This is the
  authorization fact.

Never let Position influence authorization. Never let Role stand in for
Position. Two columns, two meanings.

### 3.5 Console's roles stay in Console's database — and that is the template, not an exception

Console is **operator-tier** (`.claude/rules/access-tiers.md`): it acts as 876
across every organization, on 876's own authority, with no org grant. Its roles
are therefore **not** org-scoped `app_roles`, and must not be stored there. They
stay in Console's own `roles` / `console_members` tables.

Product apps (CRM, Couriers, Invoice, Billing) are **org-tier**: their roles are
per `(app, organization)` rows in the core API's `app_roles`, assigned through
`app_assignments`.

**The template is that both consume the identical catalog format and the
identical resolver.** One `AppPermissionCatalog`. One
`resolveEffectivePermissions`. Two storage homes, chosen by tier. That is the
whole design, and it is what makes "add a new app" a declaration rather than a
rewrite.

### 3.6 The three-layer enforcement rule — this is the heart of the standard

Every gated capability in every 876 app is enforced at **three** layers, and all
three must exist:

| Layer                        | Where                                                      | Purpose                                           | Is it security?                   |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | --------------------------------- |
| **1. Navigation visibility** | The nav registry's `requires` clause, resolved server-side | The operator is not shown a door they cannot open | **No.** Pure UX.                  |
| **2. Route guard**           | `requireConsolePermission(permission)` in the page/layout  | The route refuses to render                       | **Yes.**                          |
| **3. API authorization**     | The route handler's guard, then the owning service         | The mutation refuses to execute                   | **Yes**, and it is the last word. |

**The binding rule:** a nav item's `requires.permission` **must be the same
permission key its destination route's guard checks.** A test walks the registry
and asserts this for every item. That test is the only thing that prevents the
two from drifting, which is the failure mode this whole design exists to
prevent — a hidden link whose route is still open is a security hole; a visible
link whose route redirects is a broken product.

**Hiding a link is never a substitute for a guard.** If you find yourself adding
a nav requirement to a route that has no guard, add the guard.

### 3.7 Permission vs. feature flag vs. experiment — three slots, never merged

This distinction is repeatedly gotten wrong, so it is spelled out.

| Concept          | Question it answers                                    | Who decides                        | Where it lives                     | May it gate a route guard?               |
| ---------------- | ------------------------------------------------------ | ---------------------------------- | ---------------------------------- | ---------------------------------------- |
| **Permission**   | _May this person do this?_                             | The organization / 876, via a role | Catalog + role + grants/denies     | **Yes — it is the guard.**               |
| **Feature flag** | _Does this capability exist for them yet?_             | 876, via rollout                   | PostHog + local `features` catalog | **Yes**, as an AND alongside permission. |
| **Experiment**   | _Which variant of an existing capability do they see?_ | PostHog, by assignment             | PostHog experiments                | **NEVER.**                               |

**The AND rule.** A nav item renders, and a route renders, only when
`permission AND feature` both pass. Never model a rollout as a permission —
that makes turning a feature on a role edit for every operator. Never model
authorization as a flag — that makes a security boundary something an
experiment platform can flip.

**PostHog experiments** (which the platform will begin using shortly) return a
**variant string**, not a boolean. They must live in a **third, separate slot**
on the access context (`experiments: Record<string, string>`), read only by
presentational code. An experiment may choose _which of two layouts a permitted
operator sees_. It may never decide _whether_ they see it. Build the slot now,
typed and empty, with the rule enforced by a test — so that when experiments
arrive there is no temptation to reach for `can()`.

### 3.8 A missing permission hides; a missing feature hides; a _revoked_ permission on a page you are on redirects

- Nav: filtered out silently.
- Route guard on a page the operator navigated to without permission: redirect
  to `/` (existing behaviour — keep it).
- Route guard on Console entry itself (`console:access`): redirect to
  `/access-denied?reason=permission` (existing behaviour — keep it).
- Route handler: **403 with a stable error code**, never a redirect, never a
  silent empty list. Per `.claude/rules/error-handling.md`, an authorization
  failure is a value, not an exception, and the UI keeps its chrome mounted.

---

## 4. Phase 0 — Shared access primitives in `@876/core`

**Files:** `packages/core/src/access/**`

### 4.1 Add the Console permission catalog

Add `consolePermissionCatalog` to `packages/core/src/access/catalogs.ts` and
register it in `appPermissionCatalogs` under the key **`console`** (the real app
slug — verified above).

It must be the **single definition** of Console's permission vocabulary, and it
must be a **superset that covers every permission currently referenced anywhere
in Console**, including the ones `PERMISSION_GROUPS` is currently missing. Derive
it from the union of:

- every string in `SYSTEM_ROLE_DEFINITIONS` in `apps/console/src/lib/permissions.ts`;
- every literal passed to `requireConsolePermission(...)` anywhere under
  `apps/console/src/app/**` (grep for it; there are route handlers and pages);
- every value in the existing `PERMISSION_GROUPS`.

Model it with the existing `modules([...])` helper so positions come from
declaration order. Suggested module shape — **verify each key against the actual
grep before committing to it**:

```
console   (access, support, settings, billing, users, organizations, apps,
           features, widgets, storage, security, reports, danger_zone)
users     (read, list, search, create, update, delete)
organizations (read, list, search, create, update, delete)
memberships   (read, list, create, update, delete)
apps      (read, list, create, update, delete)
roles     (read, list, create, update, delete)
team      (read, list, invite, update, suspend, revoke)
```

**Two hard constraints:**

1. **Existing permission key strings are permanent identifiers and must not
   change.** `console:danger_zone`, `users:read`, `organizations:list` etc. are
   already persisted in the `roles` table's `permissions` array in production.
   Renaming one orphans a live role. The catalog's `key` for a permission is
   `<moduleKey>:<action>` — confirm that the existing `defineAppPermissionCatalog`
   composes keys exactly that way, and if it does not, **do not change the
   composer**; instead give the catalog module keys and actions that reproduce
   the existing strings byte-for-byte. Read `packages/core/src/access/index.ts`
   lines 73–115 before deciding.
2. `console:danger_zone` and every `:delete` action must carry
   `isDangerous: true`, so the role editor can render them behind a distinct
   affordance.

### 4.2 Add the access context type + resolver

New file `packages/core/src/access/context.ts`. Export:

```ts
export interface AccessContext {
  /** The acting subject. */
  subject: { userId: string; accountType?: string | null }
  /** Effective permission keys, already resolved and catalog-intersected. */
  permissions: readonly string[]
  /** Enabled feature-flag keys. */
  features: readonly string[]
  /** PostHog experiment variant assignments. Presentational use ONLY. */
  experiments: Readonly<Record<string, string>>
}

export function can(context: AccessContext, permission: string): boolean
export function hasFeature(context: AccessContext, feature: string): boolean
export function variantOf(
  context: AccessContext,
  experiment: string
): string | null
```

`can` and `hasFeature` are pure, total, and never throw — a malformed context
degrades to `false`. There is deliberately **no** `canExperiment`; §3.7.

### 4.3 Add the navigation registry primitives

New file `packages/core/src/access/navigation.ts`. This is the piece every app
will copy, so its contract matters more than its implementation.

```ts
/** What a nav entry requires to be visible. Undefined = always visible. */
export interface NavRequirement {
  /** Required permission key. */
  permission?: string
  /** Required feature-flag key. */
  feature?: string
  /** Visible when ANY of these permissions is held. */
  anyPermission?: readonly string[]
}

export interface NavEntry {
  key: string
  title: string
  href: string
  /** A STRING icon key. Never a component — this crosses the RSC boundary. */
  icon: string
  colorClassName?: string
  requires?: NavRequirement
  children?: readonly NavEntry[]
}

export interface NavGroupDefinition {
  key: string
  label?: string
  entries: readonly NavEntry[]
}

export function defineNavigation(
  groups: readonly NavGroupDefinition[]
): readonly NavGroupDefinition[]

export function resolveNavigation(
  groups: readonly NavGroupDefinition[],
  context: AccessContext
): NavGroupDefinition[]
```

`resolveNavigation` semantics — implement exactly:

- An entry with no `requires` is always visible.
- `permission` and `feature` are **AND**ed. Both present ⇒ both must pass.
- `anyPermission` passes when at least one key is held. It ANDs with `feature`.
  `permission` and `anyPermission` may both be present; both must then pass.
- **Children are filtered first.** A parent that has `children` declared but ends
  up with **zero** visible children is itself removed — even if the parent's own
  `requires` passes. A dropdown that opens onto nothing is worse than no
  dropdown. (A parent with no `children` key at all is a plain link and is
  unaffected by this rule.)
- A group whose entries all filter out is removed entirely, so the sidebar
  renders no orphan separators.
- The return value is **plain, structurally-cloneable data** — no functions, no
  class instances, no icon components. It must survive the RSC → client
  boundary. A test must assert `JSON.parse(JSON.stringify(result))` deep-equals
  the result.
- Pure and total: it never throws, never mutates its inputs, and returns a new
  array. A test must assert the input array is unchanged after a call.

Export everything new from `packages/core/src/access/index.ts` and from
whatever the package's subpath export map requires (check
`packages/core/package.json` — do **not** guess the export path; read it).

### 4.4 Tests — Phase 0

`packages/core/src/access/context.test.ts` and `navigation.test.ts`. Minimum
coverage, per `.claude/rules/testing.md` (assert full shapes, exact values, both
sides of every branch):

- `can` / `hasFeature`: held, not held, empty array, `undefined` permissions
  array coerced via `as unknown as`, empty-string permission, a permission that
  is a _prefix_ of a held one (`users:read` must not match `users:reading`).
- `variantOf`: assigned, unassigned, empty map, non-string value.
- `resolveNavigation`, one test per rule above, plus: nested two levels deep;
  parent visible + all children hidden ⇒ parent removed; parent hidden + child
  visible ⇒ both removed; group emptied ⇒ group removed; serializability;
  input immutability; `anyPermission` with an empty array (must be treated as
  _unsatisfiable_, and there must be a test saying so explicitly).
- Catalog: a test asserting **every** permission string referenced by
  `SYSTEM_ROLE_DEFINITIONS` exists in `consolePermissionCatalog` — this is the
  anti-drift test and it is the most important test in the phase.
- A snapshot of the sorted catalog key list, so an accidental addition or
  removal is visible in a diff.

---

## 5. Phase 1 — Console adopts the catalog

**Files:** `apps/console/src/lib/permissions.ts`, `apps/console/src/types/permission.ts`, `apps/console/prisma/seed.ts` (read it first), role-editor components.

1. `PERMISSION_GROUPS` is **deleted as a hand-written constant** and derived from
   `consolePermissionCatalog` via `groupByModule` (or a thin adapter to the
   existing `PermissionGroup` shape). The drift described in §2.2(2) must become
   structurally impossible, not merely fixed once.
2. `SYSTEM_ROLE_DEFINITIONS` keeps its four roles and their exact current
   permission sets — **do not change what any role grants in this phase** — but
   every string in it must now be typed against, and validated at module load
   against, the catalog. An unknown key must fail a test, loudly.
3. `hasPermission` in `apps/console/src/lib/permissions.ts` delegates to the core
   `can`, or is replaced by it. One implementation.
4. Keep `CONSOLE_ACCESS_PERMISSION` and `CONSOLE_DANGER_ZONE_PERMISSION` exported
   from where they are — they are imported by guards.

**Tests:** extend `apps/console/src/lib/permissions.test.ts`. Assert: derived
groups contain every catalog permission and nothing else; every system role's
permissions are a subset of the catalog; the four role names and their exact
permission counts (14 / 29 / 35 / 35 — pin these as literals so a change is
deliberate); `staff` does **not** hold any `:delete` or `console:danger_zone`;
`super_admin` holds every catalog key **or** the test names the deliberate
exclusions explicitly.

---

## 6. Phase 2 — The request-scoped access context in Console

**Files:** `apps/console/src/lib/auth/access-context.ts` (new), `guards.ts`, `route-guard.ts`, `apps/console/src/lib/features.ts`.

Build **one** `React.cache`-memoized resolver that produces the whole
`AccessContext` for a request:

```ts
export const resolveAccessContext = cache(
  async function resolveAccessContext(userId: string): Promise<AccessContext | null>
)
```

It composes:

- **permissions** — from `service.team.retrieve(userId)` → the member's role →
  `role.permissions`, intersected with `consolePermissionCatalog` through
  `resolveEffectivePermissions`. **The catalog intersection is new and is
  required**: a permission that was removed from the catalog must stop being
  effective without anyone editing a role row.
- **features** — from the existing `getConsoleFeatures`. Reuse it; do not issue a
  second evaluation. If `getConsoleFeatures` currently returns a shaped object
  rather than a key list, add a thin adapter — **do not rewrite the feature
  pipeline in this phase**.
- **experiments** — an empty `{}` for now, with a `TODO(posthog-experiments)`
  comment naming §3.7. Typed, present, unused.

**Cache-identity trap:** `React.cache` compares arguments with `Object.is`. The
resolver must take **primitives only** (a `userId` string). A resolver taking
`{ userId }` never hits the cache. Add a comment saying so; this has bitten this
repo before (`.claude/rules/navigation-performance.md` Rule 3).

Then rewrite the guards on top of it, **preserving every existing redirect
target and every existing behaviour**:

- `findConsoleAccess` keeps its signature and return type (`Access | null`) —
  other code imports it — but is now derived from the context.
- `requireConsoleAccount`, `requireConsolePermission` (both the page and the
  route-handler variants) keep their signatures and their redirect/response
  behaviour exactly.
- Add `requireConsoleFeature(userId, featureKey)` and a combined
  `requireConsoleCapability(userId, { permission, feature })`.

**Preserve the existing platform-outage semantics in `requireAccess` exactly:**
an explicit `user/not-found` / banned / non-active platform account signs the
operator out; a _thrown_ infrastructure failure does **not** invalidate an
otherwise valid Console session. That asymmetry is deliberate and load-bearing.
Do not "simplify" it. Add a regression test that pins both directions.

**Tests:** `access-context.test.ts` — at least 20 cases. Every branch of the
composition; catalog intersection actually removing a stale permission; feature
outage degrading to no features (and **not** to no permissions); memoization
(assert the underlying service is called exactly once for two resolver calls in
one render); a member with `status: 'suspended'`; a member with no role row;
the two platform-outage directions above.

---

## 7. Phase 3 — The permission-annotated navigation registry

**Files:** `apps/console/src/components/shell/nav-config.ts`, `settings-options.ts`, `sidebar.tsx`, `mobile-nav.tsx`, `shell.tsx`, plus a new icon-key resolver.

1. Convert `navConfig` to `defineNavigation([...])` with **string icon keys** and
   a `requires` clause on every entry. The icon components move into a
   `NAV_ICONS: Record<string, IconComponent>` map resolved **inside the client
   sidebar**, per the RSC-serializability rule in `.claude/rules/module-settings.md`
   and `.claude/rules/app-layout.md`. Keep the existing `colorClassName` values
   verbatim — this is not a visual redesign.

   Proposed requirements — **each one must match the guard on its destination
   route; grep the route before you assign it, and if the route has no guard,
   add the guard in Phase 6 and note it in your report**:

   | Item          | href        | `requires`                                                               |
   | ------------- | ----------- | ------------------------------------------------------------------------ |
   | Dashboards    | `/`         | _(none — Console entry is already gated by `console:access`)_            |
   | Users         | `/users`    | `permission: 'users:list'`                                               |
   | Organizations | `/orgs`     | `permission: 'organizations:list'`                                       |
   | Support       | `/support`  | `permission: 'console:support'`                                          |
   | Security      | `/security` | `permission: 'console:security'` _(add to catalog if absent — see §4.1)_ |
   | Apps          | `/apps`     | `permission: 'apps:list'`                                                |
   | Widgets       | `/widgets`  | `permission: 'console:widgets'`                                          |
   | Storage       | `/storage`  | `permission: 'console:storage'` _(add to catalog if absent)_             |
   | Reports       | `/reports`  | `permission: 'console:reports'` _(add to catalog if absent)_             |
   | Settings      | `/settings` | `permission: 'console:settings'`                                         |

2. `settings-options.ts` gets the same treatment. The Team entry
   (`/settings/users`) requires `team:list`; the Roles entry
   (`/settings/users/roles`) requires `roles:list`.

3. The shell resolves the navigation **server-side** — it already has the
   operator — and passes the resolved plain-data groups to the client sidebar.
   The client sidebar must **not** receive the full registry and filter it
   itself: shipping the full registry to the browser tells an unprivileged
   operator exactly what exists. Assert this with a test that renders the
   sidebar with a `staff` context and greps the rendered output for a
   privileged href.

4. Do not regress `nav-progress` or the active-link behaviour.

**Tests:** rewrite `nav-config.test.ts` and `sidebar.test.tsx`. Minimum:
one test per role (`staff`, `admin`, `owner`, `super_admin`) asserting the
**exact** visible href list — a literal array, sorted, compared with `toEqual`,
not `toContain`. A `staff` operator must not see Security, Storage, Settings, or
Reports; assert each of those with an explicit `not.toContain`. Plus: a feature
flag off hides an otherwise-permitted item; an empty group is dropped; the
resolved payload is serializable; and the **binding test** from §3.6 — walk every
registry entry, resolve its `href` to a file under `apps/console/src/app/`, and
assert the file (or its nearest gating layout) references the same permission
key. If a route has no guard, the test must **fail**, listing the route. Do not
weaken this test to make it pass — fix the route in Phase 6.

---

## 8. Phase 4 — Affiliation, expiry, and justification on the Console grant

**You cannot run migrations. Follow this exactly.**

1. Edit `apps/console/prisma/schema/user.prisma`, adding to `Member`:

   ```prisma
   /// "staff" | "contractor" | "external" — see .claude/rules/… §3.2.
   /// Attribute of the grant, never the gate. `staff` additionally requires a
   /// live Efesto membership, verified at guard time.
   affiliation   String    @default("staff")
   /// Free-text position for a non-staff operator. For `staff`, the position is
   /// resolved live from the identity API's employee profile instead.
   title         String?
   /// Unix seconds. REQUIRED for contractor/external. An expired grant is denied.
   expiresAt     BigInt?   @map("expires_at")
   /// Why this grant exists. REQUIRED for contractor/external. Audit trail.
   justification String?
   /// Opaque 876 user id of the operator who issued this grant.
   invitedBy     String?   @map("invited_by")
   ```

2. Hand-write the migration into
   `apps/console/prisma/migrations/20260829000000_console_member_affiliation/migration.sql`.
   Additive `ALTER TABLE ... ADD COLUMN` statements only, with the default on
   `affiliation` so existing rows backfill to `'staff'`. **Do not** add a NOT
   NULL column without a default. **Do not** write a `DROP`. The orchestrator
   applies it.

3. Enforce in the service layer (`apps/console/src/lib/service/team/`), which is
   the only caller allowed to touch `prisma`:
   - `create` / `update` reject a `contractor` or `external` grant with no
     `expiresAt` or no `justification`, returning a `ServiceResult` error value
     (never a throw) with a stable code such as `team/expiry-required`.
   - `expiresAt` must be in the future at write time.
   - `affiliation: 'staff'` must not carry a `title` (position comes from the
     employee profile) — reject, do not silently drop.

4. Enforce in the guard (`requireAccess` in `guards.ts`):
   - An `expiresAt` in the past ⇒ redirect `/access-denied?reason=expired`.
   - `affiliation === 'staff'` ⇒ verify an **active** Efesto membership for the
     user through `$876`. Missing or inactive ⇒ redirect
     `/access-denied?reason=employment`. **An infrastructure failure of this
     lookup must NOT deny access** — it can only ever subtract, per §3.2, so a
     thrown error is caught and treated as "unverified, allow", exactly like the
     existing platform-outage handling. Add a `Sentry.captureMessage` on that
     path so the gap is visible.
   - The Efesto org id must come from configuration, not a literal:
     `CONSOLE_STAFF_ORGANIZATION_ID`. Add it to `apps/console/.env.example` with
     a `# optional — when unset, staff employment verification is skipped`
     comment, per `.claude/rules/env-configuration.md`. **Do not** hard-code
     `org_fa2cfb0bce834ae6a6537830159e5f14` anywhere in source.

5. Add `/access-denied` reasons `expired` and `employment` to whatever renders
   that page, with copy that tells the operator what to do next.

**Tests:** at least 25 across `team.test.ts` and `guards.test.ts`. Every
validation branch; every guard branch; the fail-open direction on the employment
lookup asserted explicitly (this is the one an over-eager refactor will get
wrong); an expired grant denied; a grant expiring _during_ a session denied on
the next request; `staff` + no `CONSOLE_STAFF_ORGANIZATION_ID` ⇒ allowed.

---

## 9. Phase 5 — The team page, rebuilt

**Files:** `apps/console/src/app/(app)/settings/users/(list)/page.tsx`, `_components/member-row.tsx`, `team-skeleton-columns.ts`, and new `_components/` as needed.

1. **Kill the N+1.** One `service.team.list()`, then **one**
   `$876.users.admin.list({ ids })` for every grant id. Build a `Map` and join in
   memory. This is required by `.claude/rules/data-loading.md`; a parallel
   per-row retrieve is still an N+1.

2. **Resolve Position.** For grants with `affiliation === 'staff'`, batch-resolve
   the Efesto employee profile / membership job title. Find the right client verb
   — do **not** invent one, and do **not** loop per row. If no batch verb exists
   on `$876` / `workspace`, say so plainly in your report and render the grant's
   `title` fallback; adding the batch endpoint is the orchestrator's job.

3. **Orphaned grants render as a first-class state, not as blanks.** A grant
   whose identity lookup returns nothing renders the row with an explicit
   "Unresolved account" treatment, the raw user id shown in muted monospace, and
   a destructive "Revoke" affordance. **It must never render as an empty row.**
   That silent-blank behaviour is the bug that started this work.

4. **Columns:** Avatar · Name (with `@username` beneath) · Email · **Position** ·
   **Affiliation** (badge) · Role (badge) · **Expires** (muted; `—` for staff).
   Follow the tier scale in `.claude/rules/app-layout.md` §12 exactly: Name is
   the single tier-1 cell (`font-medium`); email, position, and expiry are tier-3
   (`text-muted-foreground`); affiliation and role are `<Badge>`s, never styled
   text. Empty values render an em dash, never a blank cell.

5. **Add the missing chrome.** This page currently has **no `ResourceToolbar`**.
   Add one: title "Team", `primaryLabel="Add"`, `primaryHref="/settings/users/new"`,
   `primaryVariant="info"`, `refresh`. Add a `StatusFilterHeading` from
   `@876/ui/status-filter-heading` over the grant status (`all` / `active` /
   `suspended` / `expired`), threaded into the **service call** — never filtered
   in the component (`.claude/rules/app-layout.md` §5). Update
   `team-skeleton-columns.ts` to the real new column set so the fallback cannot
   drift.

6. **Green is for status badges only. No green buttons.** (`CLAUDE.md`.)

7. Keep the `<Suspense>` boundary around the data child only; the toolbar and the
   table header row must render immediately (`CLAUDE.md` → Loading States).

**Tests:** at least 20. The batch call is made **once** with the exact id array
(`toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith`); an orphaned grant renders
the unresolved state and **not** an empty row; each status filter threads the
right value into the service call and `all` threads `undefined`; the empty state;
a mixed list of staff and external grants; expiry rendering; every column's tier
class. Add a **regression anchor** test named for this bug, per
`.claude/rules/testing.md`, asserting that a grant whose identity lookup fails is
still visible and still identifiable.

---

## 10. Phase 6 — Guard sweep, and Phase 7 — the standard, written down

### Phase 6 — every gated surface actually has a guard

Grep every route handler under `apps/console/src/app/api/**` and every page under
`apps/console/src/app/(app)/**`. For each:

- Confirm it calls `requireConsolePermission` (route handlers) or the page/layout
  guard, with a permission key **that exists in the catalog**.
- Where a route has no guard, add one. Where it has a guard with a key not in the
  catalog, that is a defect — add the key to the catalog (Phase 0) and note it.
- The binding test from §3.6/§7 must now pass without being weakened.

Add `apps/console/src/lib/auth/guard-coverage.test.ts`: walk the `app/api`
directory tree, and assert **every** `route.ts` exporting a mutating method
(`POST`/`PATCH`/`PUT`/`DELETE`) references `requireConsolePermission`. List any
deliberate exemptions in an explicit allow-list constant with a comment per entry
saying why. An unexplained exemption is a failure.

### Phase 7 — documentation

Two documents. These are the deliverable that makes this reusable, so write them
as carefully as the code.

1. **`.claude/rules/access-control.md`** — the platform rule file. It must cover:
   the three-layer rule (§3.6); permission vs. flag vs. experiment with the AND
   rule and the experiment prohibition (§3.7); operator-tier vs. org-tier
   storage with one catalog format (§3.5); the nav registry contract and its
   RSC-serializability requirement; the binding test requirement; the
   fail-open/fail-closed direction rule for verifications that can only subtract;
   and a **"Do not"** list in the style of the other rule files. Cross-link
   `access-tiers.md`, `app-access.md`, `feature-flags.md`, `app-layout.md`.
   Add a one-line pointer to it in the root `CLAUDE.md` "Required Context" list.

2. **`docs/architecture/0NN-console-access-control.md`** — the decision record.
   Check `docs/architecture/` for the next free number; do not guess it. It
   records **why** Console is not org-gated, the affiliation model and its three
   values, why employment verification fails open, why experiments are excluded
   from `can()`, and a step-by-step **"Adopting this in a new app"** section: (1)
   declare your catalog in `packages/core/src/access/catalogs.ts`; (2) choose
   your tier and therefore your role storage; (3) build your `AccessContext`
   resolver; (4) declare your nav registry with `requires`; (5) add the binding
   test; (6) add the guard-coverage test.

**Do not** copy the rule file into `.agents/rules/` or `.grok/rules/` yourself —
mirroring is the orchestrator's job and getting it wrong (e.g. copying `cli.md`
into `.grok/`) is a documented hazard.

---

## 11. Test requirements — the floor, not the target

| Phase                    | Minimum new/changed test cases |
| ------------------------ | ------------------------------ |
| 0 — core primitives      | 45                             |
| 1 — catalog adoption     | 15                             |
| 2 — access context       | 20                             |
| 3 — navigation           | 30                             |
| 4 — affiliation & expiry | 25                             |
| 5 — team page            | 20                             |
| 6 — guard sweep          | 10                             |
| **Total**                | **165**                        |

Every test obeys `.claude/rules/testing.md`. In particular, and these are the
ones most often violated:

- **Every test must be able to fail.** Ask of each: "if I deleted the line of
  production code this covers, would this fail?"
- Assert **exact** values, never `toBeDefined()` / `toBeGreaterThan()` as the
  only assertion.
- Assert **both sides** of a `{ data, error }` result.
- `toHaveBeenCalledWith(...)` with exact arguments, and
  `toHaveBeenCalledTimes(n)` with an exact `n` — never a bare `toHaveBeenCalled()`.
- **Negative-space tests**: for every guard clause, assert the downstream call
  did **not** happen (`expect(fn).not.toHaveBeenCalled()`).
- `vi.clearAllMocks()` in every `beforeEach`; `vi.unstubAllEnvs()` in `afterEach`
  wherever `vi.stubEnv` is used.
- Factories defined per test file with realistic domain data (real-looking 876
  ids like `user_695d45c54a374ff0a570003e15668891`, not `'test'` / `'foo'`), and
  **called inside `it()`**, never at module level.
- The **Prisma dynamic-ref mock pattern** from `.claude/rules/testing.md` for
  anything touching `@/lib/db`.
- Security-input corpus (`it.each`) on any function accepting an operator-supplied
  string — the `justification` and `title` fields qualify.

---

## 12. Your report — required, and it must be honest

Write `.claude/reports/gpt-web/2026-08-29-console-access-control-standard.md`
and commit it. Be exhaustive; there is no length limit and the orchestrator reads
every word. Required sections:

1. **Summary** — what you built, in five sentences.
2. **Per-phase status** — a table: phase, status (`complete` / `partial` /
   `skipped`), files touched, test-case count actually written.
3. **Every file changed** — path, and one line on what changed and why.
4. **Migration** — the exact path of the SQL you wrote, its full contents inline,
   and what the orchestrator must run.
5. **Decisions you made that the brief did not settle** — every one, with your
   reasoning. This is the most valuable section; do not compress it. If you chose
   between two readings of an instruction, say so.
6. **Things you could not verify** — anything you inferred rather than read,
   anything you could not find, any place where the brief's ground truth (§2)
   disagreed with the actual code. **If §2 is wrong about something, say so
   loudly**; it was gathered by a different agent and may have drifted.
7. **Gaps deliberately left** — anything you did not do, and why. Missing batch
   endpoints, permissions you could not map to a route, tests you could not
   write without running code.
8. **Risk notes** — anything that could break production. Especially: any
   permission key you added, changed, or removed, and whether any live `roles`
   row is affected.
9. **Verification the orchestrator must run** — the exact commands, in order.
   State plainly that you executed none of them.

**Do not claim any command was run, any test passed, or any build succeeded.**
You cannot run anything. A report that claims otherwise is worse than no report.

---

## 13. Verification the orchestrator will run (for your awareness — do not run these)

```bash
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
npx prettier --check <changed paths>
grep -rn "eslint-disable" <changed paths>   # must return nothing
```

Plus the migration, applied by the orchestrator against Neon, and a manual pass
over the Console sidebar as each of the four roles.

---

## 14. Scope fence

**In scope:** `packages/core/src/access/**`, `apps/console/**`,
`.claude/rules/access-control.md`, `docs/architecture/`, `CLAUDE.md` (one
pointer line).

**Out of scope — do not touch:** `apps/api/**`, `apps/crm/**`, `apps/crm-api/**`,
`apps/billing/**`, `apps/billing-api/**`, `apps/couriers/**`, `apps/invoice/**`,
`apps/876/**`, `apps/enterprise/**`, `packages/admin/**`, `packages/sdk/**`,
`packages/client/**`, `packages/ui/**`, any `pnpm-lock.yaml`, any `.env` file
(other than adding a documented key to `apps/console/.env.example`), any CI
workflow, `.agents/rules/**`, `.grok/rules/**`.

If a phase genuinely cannot be completed without touching an out-of-scope path,
**stop that phase, complete every other phase in full, and say so in §7 of your
report.** Do not widen the blast radius to finish something.
