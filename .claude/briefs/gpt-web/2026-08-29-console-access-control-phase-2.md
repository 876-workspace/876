# Brief — Console Access Control, Phase 2: route enforcement, staff identity, experiments

**Delegate:** ChatGPT web (GPT‑5.6, high reasoning)
**Branch:** `feat/console-access-control` (already exists; continue on it)
**Repo:** `876-workspace/876`
**Date:** 2026-08-29
**Orchestrator:** Claude Code (reviews, verifies, runs migrations and seeds, commits corrections)
**Predecessor:** `.claude/briefs/gpt-web/2026-08-29-console-access-control-standard.md`
**Your last report:** `.claude/reports/gpt-web/2026-08-29-console-access-control-standard.md`

---

## 0. YOUR OPERATING RULES — absolute, unchanged from the last brief

You are a **code writer only**. Claude Code owns the repository, the database,
verification, and release.

**You MUST:**

1. Work **only** on `feat/console-access-control`. It exists and has moved since
   your last pass — **pull it before you start.** Your work is on it, plus five
   correction commits from the orchestrator (§1).
2. Edit / create / delete files, and commit those edits to that branch.
3. Write a completion report to
   `.claude/reports/gpt-web/2026-08-29-console-access-control-phase-2.md`
   (format in §10), included in your final commit.
4. Write **as many tests as the work warrants — err heavily toward more.** There
   is no budget constraint. §9 sets per-phase floors; below the floor is
   incomplete.
5. Follow the checked-in rule files. Read, at minimum, before writing a line:
   - `CLAUDE.md` (root)
   - `.claude/rules/access-control.md` ← **the standard you wrote last pass**
   - `.claude/rules/app-structure.md`, `app-layout.md`, `app-access.md`
   - `.claude/rules/access-tiers.md`, `sdk-conventions.md`, `api-access.md`
   - `.claude/rules/feature-flags.md`, `data-loading.md`, `error-handling.md`
   - `.claude/rules/types.md`, `testing.md`, `code-style.md`, `naming.md`
   - `docs/architecture/013-console-access-control.md`

**You MUST NOT:**

- **Do not create, rename, delete, merge, or rebase any branch.** One branch only.
- **Do not open, merge, or comment on a pull request.**
- **Do not touch `main`.**
- **Do not run any shell command, build, test, lint, migration, or database
  operation.** You cannot. Never write "tests pass" — write "not executed;
  verification is the orchestrator's".
- **Do not run `prisma migrate`.** Edit the `.prisma` model **and** hand-write
  migration SQL to the exact path this brief names. The orchestrator applies it.
- **Do not add `Co-Authored-By`, "Generated with", or any AI attribution.**
- **Do not add `eslint-disable`.** A rule you cannot satisfy means the code is
  wrong — fix the code.
- **Do not use `as any`.** `as unknown as T` only in tests, only for a deliberate
  type violation under test.
- **Do not weaken production code to make it testable.** Making `searchParams`
  optional, deleting a `ResourceToolbar`, or removing a status filter so a test
  can render a page more easily is a regression, and it was reverted once on this
  branch already. Test the component the product actually ships.
- **Do not rename** a permission key, database table, column, route path,
  operation id, env var, or error code. They are contracts.

---

## 1. What changed since your last pass — read this before planning

Your work was reviewed, corrected, and verified. **Five orchestrator commits sit
on top of yours.** Do not undo them.

| Commit                 | What it fixed                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `05f23ba2`             | Regenerated the Console Prisma client for the affiliation columns. Your migration was correct; the client had not been regenerated, so 18 typecheck errors appeared across guards and services.               |
| `852eef3c`             | **Granted the navigation-gated permissions to system roles.** See below — this was the most important defect.                                                                                                 |
| `bb91710b`             | `applyRoleChange` still read `.userId` off the new `{ data, error }` envelope from `team.create`/`update`, so a rejected grant dereferenced null. Fixed both call sites.                                      |
| `8d6c7c15`             | `mobile-nav.tsx` tripped `react-hooks/static-components` by binding a resolved component to a capitalized local during render. `nav-icons.tsx` now exports `NavIcon`, which uses `createElement`.             |
| `4d2592dc`, `776c05e7` | Realigned six stale suites you left behind after changing shapes you did not own, and put `member-row.test.tsx` under jsdom — its 8 cases had never executed, because Console's vitest environment is `node`. |

### The defect worth understanding

You correctly flagged in §8 of your report that the catalog declared `team:*`
but no role might grant it. That was true, and it was worse than a risk: **six
permissions required by your navigation registry were held by no system role at
all** — `team:list`, `team:revoke` (and the rest of `team:*`), `console:security`,
`console:storage`, `console:reports`, plus `apps:create` and `apps:update`.

The effect: the Team settings entry, Security, Storage and Reports were invisible
to every operator **including super_admin**, and the `team:revoke` route you added
was unreachable by anyone. The user's original report — "the Team page renders
empty" — would have become "the Team page cannot be reached".

The orchestrator granted them by tier (staff: read-only reporting; admin: storage,
reports and full team management; owner/super_admin: the complete catalog),
re-seeded the live roles, and added an anti-drift test in
`apps/console/src/components/shell/nav-config.test.ts` asserting **every**
navigation-required permission is granted by at least one system role.

**The lesson to carry into this brief:** a permission that nothing grants is
indistinguishable from a permission that does not exist. Whenever you add a
permission requirement anywhere in this phase, you must also state which system
role holds it, and the anti-drift test must still pass.

### Database state, verified — it was never corrupted

The orchestrator inspected the live Console datastore directly:

- Your migration is applied; `affiliation`, `title`, `expires_at`,
  `justification`, `invited_by` all exist on `console_members`.
- There is exactly **one** member row: `super_admin`, `active`, `staff`
  affiliation, no expiry.
- It joins cleanly to the `roles` table (note: the table is `roles`, not
  `console_roles`).
- All four system roles are seeded and now carry the corrected permission sets
  (staff 15, admin 39, owner 46, super_admin 46).

So: the empty Team page was permission drift and an N+1, never data corruption.
Do not write defensive code for a corrupt-database theory.

---

## 2. The problem this phase exists to solve

Your last pass built layer 3 — navigation gating. It works. But
`.claude/rules/access-control.md` §"The three enforcement layers", which **you
wrote**, requires three, and layer 2 is largely missing.

The orchestrator measured it:

| Section                      | Nav entry gated on   | Route guard                        | Reachable by URL without the permission? |
| ---------------------------- | -------------------- | ---------------------------------- | ---------------------------------------- |
| `/users`                     | `users:list`         | `console:users` ✅                 | no                                       |
| `/orgs`                      | `organizations:list` | `console:organizations` ✅         | no                                       |
| `/apps`                      | `apps:list`          | `console:apps` ✅                  | no                                       |
| `/widgets`                   | `console:widgets`    | `console:widgets` ✅               | no                                       |
| `/settings`                  | `console:settings`   | `console:settings` ✅              | no                                       |
| **`/support`** (7 pages)     | `console:support`    | **none**                           | **YES**                                  |
| **`/security`** (3 pages)    | `console:security`   | **none**                           | **YES**                                  |
| **`/storage`** (1 page)      | `console:storage`    | **none**                           | **YES**                                  |
| **`/reports`** (1 page)      | `console:reports`    | **none**                           | **YES**                                  |
| **`/settings/users`** (Team) | `team:list`          | **none** (only `console:settings`) | **YES**                                  |
| **`/settings/users/roles`**  | `roles:list`         | **none** (only `console:settings`) | **YES**                                  |
| **`/settings/security`**     | `console:security`   | **none** (only `console:settings`) | **YES**                                  |

**Navigation gating without matching route gating is security theater.** A staff
operator who types `/security` into the address bar gets the page; an admin who
types `/settings/security` gets it too. The sidebar merely declines to mention it.
That is the single most important thing to fix in this phase, and it is Phase A.

Two further gaps you named honestly in your own report — the Phase 6 guard sweep
and the staff Position resolver — are Phases B and C. The experiments hook you
left as a `TODO` is Phase E.

---

## 3. Phase A — bind every route to the permission its nav entry declares

**This is the highest-value work in the brief. Do it first and do it completely.**

### A.1 The binding rule, made mechanical

`.claude/rules/access-control.md` already states the binding rule. Make it
enforceable rather than aspirational.

Create `apps/console/src/lib/auth/route-permissions.ts`:

```ts
import 'server-only'

/**
 * The permission each Console route subtree requires, keyed by the subtree's
 * root path. This is the single declaration of layer-2 enforcement, and the
 * anti-drift test binds it to the navigation registry so a nav entry can never
 * hide a section that its route still serves.
 */
export const ROUTE_PERMISSIONS = {
  '/users': 'console:users',
  '/orgs': 'console:organizations',
  '/apps': 'console:apps',
  '/widgets': 'console:widgets',
  '/features': '<the permission features/layout.tsx already uses>',
  '/support': 'console:support',
  '/security': 'console:security',
  '/storage': 'console:storage',
  '/reports': 'console:reports',
  '/settings': 'console:settings',
  '/settings/users': 'team:list',
  '/settings/users/roles': 'roles:list',
  '/settings/security': 'console:security',
} as const satisfies Record<string, string>
```

Read `apps/console/src/app/(app)/features/layout.tsx` and use whatever permission
it already enforces; do not invent one.

Nested entries are deliberate: `/settings/users` requires **both**
`console:settings` (from the parent layout) and `team:list` (from its own).
Layered layout guards compose naturally — that is the point.

### A.2 Add the missing layouts

For each subtree in `ROUTE_PERMISSIONS` that has no layout guard today —
`/support`, `/security`, `/storage`, `/reports`, `/settings/users`,
`/settings/users/roles`, `/settings/security` — add or extend the segment
`layout.tsx`, copying the shape of the existing reference at
`apps/console/src/app/(app)/users/layout.tsx`:

```tsx
import type { ReactNode } from 'react'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

export default async function SecurityLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/security')
  await requireConsolePermission(sessionUser.id, ROUTE_PERMISSIONS['/security'])

  return <>{children}</>
}
```

Note carefully:

- `apps/console/src/app/(app)/settings/users/layout.tsx` **already exists** and is
  currently a pass-through returning `<>{children}</>`. Extend that file; do not
  add a second one. **A separate agent is actively editing this file and others
  under `settings/users/` — if its current contents differ from what this brief
  describes, preserve what is there and add the guard around it.**
- A guard must **block**, not stream. Do not put it behind `<Suspense>`, and do
  not make it non-blocking. `.claude/rules/navigation-performance.md` Rule 3 is
  explicit: a guard cannot stream, so make it cheap instead. It already is —
  `resolveConsoleGrant` and `resolveAccessContext` are both `React.cache`d, so
  adding a second layout guard on a nested path costs **zero** extra queries.
- Do **not** add a `loading.tsx` anywhere in this phase.
- Do **not** await anything else in these layouts.

### A.3 The test that makes the binding permanent

Create `apps/console/src/lib/auth/route-permissions.test.ts`. It must, by
**reading the filesystem** (`node:fs`, `node:path`) rather than by a hand-written
list:

1. For every key in `ROUTE_PERMISSIONS`, assert a `layout.tsx` exists at
   `src/app/(app)<key>/layout.tsx` and its source contains
   `requireConsolePermission`.
2. For every entry in `navConfig` and `SETTINGS_NAVIGATION` that declares
   `requires.permission`, assert that `ROUTE_PERMISSIONS` maps that entry's
   `href` (or the nearest ancestor path present in the map) to **the same
   permission string**. A nav entry gated on `console:security` whose route is
   gated on something else is the exact drift this test exists to catch.
3. Assert every permission in `ROUTE_PERMISSIONS` is a key in
   `consolePermissionCatalog`.
4. Assert every permission in `ROUTE_PERMISSIONS` is granted by at least one
   entry in `SYSTEM_ROLE_DEFINITIONS` — the §1 lesson, enforced on this map too.
5. Assert every `href` in `navConfig` and `SETTINGS_NAVIGATION` resolves to a
   real `page.tsx` under `src/app/(app)/`. This is the registry-to-route binding
   suite you deferred last pass. Treat a dynamic segment (`[slug]`) as matching.

Note for #5: `/` maps to `src/app/(app)/page.tsx`.

### A.4 Per-role reachability tests

In the same file or a sibling, add a table-driven suite asserting, for each of
the four system roles, the exact set of `ROUTE_PERMISSIONS` paths that role may
reach — computed from `SYSTEM_ROLE_DEFINITIONS`, written out **literally** in the
expectation. Four `toEqual` assertions on explicit arrays. If a future permission
change alters what staff can reach, that must show up as a failing test naming
the path, not as a silent widening.

---

## 4. Phase B — the guard sweep you deferred, and one real security finding

You declined to write `guard-coverage.test.ts` without being able to run the
sweep. That was the right call. The orchestrator has now run it; here are the
verified results, so you can write the test truthfully.

### B.1 Verified state

- **113 route handlers** exist under `apps/console/src/app/api/`.
- **105** call a `requireConsole*` guard.
- **8** do not:

| Handler                              | Verdict                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/health/route.ts`                | **Legitimately public.** Health probe.                                                                                                       |
| `api/auth/[...path]/route.ts`        | **Legitimately public.** The auth bridge — it is what establishes a session, so it cannot require one.                                       |
| `api/uploadthing/route.ts`           | **Legitimately unguarded here.** Protocol adapter with its own auth.                                                                         |
| `api/notes/route.ts`                 | Guarded by `requireNotepadMember` — a **different** widget-scoped guard, not a Console permission. Acceptable; the sweep must know about it. |
| `api/notes/[id]/route.ts`            | Same.                                                                                                                                        |
| `api/note-collections/route.ts`      | Same.                                                                                                                                        |
| `api/note-collections/[id]/route.ts` | Same.                                                                                                                                        |
| `api/audit-events/route.ts`          | **DEFECT — fix it.** See B.2.                                                                                                                |

- **Page coverage is structurally sound.** Every page lives under `(app)`, whose
  layout calls `requireSession` + `requireConsoleAccount`. Only `login/page.tsx`
  and `access-denied/page.tsx` sit outside, and both are correctly public. Phase A
  adds the missing _per-section_ enforcement on top of that baseline.

### B.2 The finding: `/api/audit-events` accepts unauthenticated writes

`apps/console/src/app/api/audit-events/route.ts` currently accepts any POST from
any caller and forwards it to `$876.auditEvents.create` **using Console's admin
credential**. Its comment explains the intent — "audit events are fire-and-forget
telemetry and are always attributed to the app, not the caller" — and the
credential is correctly kept server-side.

But an unauthenticated, admin-credentialed write into the platform's audit log
means anyone who can reach the Console origin can forge audit entries. An audit
log that accepts anonymous writes is not an audit log. `.claude/rules/access-tiers.md`
is explicit: _"Operator access is audited access"_ — which only holds if the audit
trail itself cannot be poisoned.

**Fix:** require a signed Console session. Do **not** require a permission — every
authenticated operator legitimately emits telemetry, so a permission check would
break analytics for staff. Call `getAuthSession` + `isSignedSession` (see
`apps/console/src/lib/auth/session.ts` and how `route-guard.ts` uses them), return
`401` for an unsigned session, and attribute the event to the session user id
rather than trusting anything in the body for identity.

Keep the handler thin and pure-transport per `.claude/rules/api-access.md`. Keep
its existing 400 behaviour for a malformed body. Do not change its response shape
for the success path — Console components already call it.

### B.3 `guard-coverage.test.ts`

Create `apps/console/src/lib/auth/guard-coverage.test.ts`. It must walk
`src/app/api/` with `node:fs` at test time — **not** a hand-maintained list of
paths — and for every `route.ts` found assert that it either:

- calls one of `requireConsolePermission` / `requireConsoleCapability` /
  `requireConsoleFeature`, or
- calls `requireNotepadMember` (the widget-scoped guard), or
- appears in an `PUBLIC_ROUTE_HANDLERS` allow-list declared **at the top of the
  test file** with a one-line justification comment per entry.

The allow-list is exactly `health`, `auth/[...path]`, `uploadthing`, and — after
B.2 — `audit-events` must **not** be on it, because it will then require a
session. Assert the allow-list has no entry that does not exist on disk, so a
deleted route cannot leave a stale exemption behind.

Add a second case asserting every `page.tsx` outside `src/app/(app)/` is in a
similarly justified `PUBLIC_PAGES` allow-list (`login`, `access-denied`).

This test is the one that must not lie. If a future route lands with no guard,
it fails and names the file.

---

## 5. Phase C — staff Position, resolved in one batched call

Your report said no suitable batch employee-profile operation existed on the
Console facade. **One does exist**, and the orchestrator verified it:

```ts
$876.orgs.employees.list(organizationId)
// → AdminResult<AdminListResponse<AdminEmployeeProfile>>
```

`AdminEmployeeProfile` (see `packages/admin/src/types.ts`) carries, among other
fields:

```ts
{
  object: 'employee_profile'
  id: string
  membership_id: string
  organization_id: string
  user_id: string | null
  job_title: string | null
  employment_status: string
  // …
}
```

That is a **single call returning every profile for the org**, each already
carrying `user_id` and `job_title`. No new verb, no N+1, nothing to invent.

### C.1 What to build

In the Team list page's data component
(`apps/console/src/app/(app)/settings/users/(list)/page.tsx`, or whatever module
now owns that fetch — **another agent is editing this area; read the current file
first and integrate with it rather than replacing it**):

1. Read the staff organization id from `process.env.CONSOLE_STAFF_ORGANIZATION_ID`
   — the variable your last pass introduced and documented in
   `apps/console/.env.example`.
2. If it is **unset**, skip position resolution entirely and render the existing
   `title` fallback. An unconfigured deployment must still render a working page.
3. If it is set, call `$876.orgs.employees.list(organizationId)` **once**,
   alongside the existing grant/identity fetches under a single `Promise.all` —
   not sequentially after them (`.claude/rules/performance-waterfalls.md` §1.5).
4. Build a `Map<string, string>` from `user_id` → `job_title`, skipping profiles
   whose `user_id` is null or whose `job_title` is null. Use a `Map`, not
   `.find()` per row (`.claude/rules/performance-js.md` §7.2).
5. Resolve each row's Position as: **staff** → the map lookup, falling back to an
   em dash when absent; **contractor/external** → the grant's own `title`, falling
   back to an em dash. Staff never read from `title` — service policy already
   rejects a `title` on a staff grant, and that stays true.
6. If the employees call returns an error, **degrade**: render em dashes for staff
   positions and keep the rest of the page fully functional. Per
   `.claude/rules/error-handling.md`, a failed enrichment must not own the page
   and must not be silently indistinguishable from "no position" — surface a
   small inline notice for the missing enrichment, not a page-level error and not
   a toast.

### C.2 Do not

- Do not fetch per row.
- Do not add an employee-profile call to the guard path. Position is display, not
  authorization; `requireAccess` must not get slower.
- Do not store a job title on the Console grant for a staff member. The employee
  profile is the source of truth; caching it in `console_members` creates a second
  copy that goes stale.

---

## 6. Phase D — the affiliation model, documented and enforced end to end

The product question behind this branch: **Console is 876's internal admin
application, but not everyone who needs it is an Efesto Technologies employee, and
being an Efesto employee must never by itself confer Console access.**

Your `affiliation` column already models this correctly. This phase makes the
policy legible and complete.

### D.1 The policy, to be written into `.claude/rules/access-control.md`

Add a section, `## Console affiliation policy`, stating:

- **A Console access grant is the only gate.** Neither an 876 account, nor an
  Efesto Technologies organization membership, nor an employee profile grants
  Console access. Absence of a grant is absence of access. (This is already true
  in code — state it.)
- **`staff`** — an Efesto Technologies member. Verified at guard time against a
  live, active membership in `CONSOLE_STAFF_ORGANIZATION_ID`. Position comes from
  the employee profile. Expiry optional: employment itself is the expiry.
- **`contractor`** — engaged by Efesto, not employed by it. Expiry **required**.
  Justification **required**. Position is free text on the grant.
- **`external`** — an auditor, regulator, law-enforcement liaison, or partner with
  a legitimate, bounded reason to see Console. Expiry **required**. Justification
  **required**. Never verified against Efesto membership, because they are
  deliberately not members.
- **Account type is irrelevant to affiliation.** An external auditor may hold a
  personal 876 account or an enterprise one; Console does not care, because
  Console authorizes off its own grant, not off the platform account's shape.
  Say this explicitly — it is the question that motivated the affiliation model.
- **Employment verification is subtractive and one-directional.** An explicit
  inactive or missing Efesto membership **denies** a `staff` grant. A provider
  outage does **not** — it fails open, because the check can only ever remove
  access, never confer it. Your `guards.ts` already implements exactly this
  distinction; the rule must record _why_, so nobody later "simplifies" the two
  paths into one falsy check.
- **Only `staff` may be granted `owner` or `super_admin`.** A contractor or
  external grant is capped at `admin`. Enforce this in
  `apps/console/src/lib/service/team/validation.ts` and state it in the rule.

### D.2 Enforce the role cap

Add the affiliation/role-cap check to `validateTeamGrant`, with a new error code
in the existing `TeamServiceError` union — `team/role-not-allowed-for-affiliation`
— and a message naming both the affiliation and the role. Wire it through
`create` and `update`. Note that `update` must evaluate the **resulting**
combination: changing affiliation from `staff` to `contractor` on a grant that
holds `owner` must be rejected just as firmly as granting `owner` to an existing
contractor.

### D.3 Complete the Phase 4 test floor you did not meet

`apps/console/src/lib/auth/guards.test.ts` must cover, each as its own `it()`:

- staff grant + active Efesto membership → allowed
- staff grant + inactive membership → redirect to `/access-denied?reason=employment`
- staff grant + membership list returns an empty array → redirect (employment)
- staff grant + the memberships call returns an `error` → **allowed** (fail open),
  and a Sentry message captured exactly once
- staff grant + the memberships call **throws** → allowed, Sentry exception
  captured exactly once
- `CONSOLE_STAFF_ORGANIZATION_ID` unset → allowed, and the memberships call
  **not** made (`expect(...).not.toHaveBeenCalled()`)
- contractor grant with a future expiry → allowed, and employment **not** checked
- contractor grant with an expiry in the past → redirect (`expired`)
- contractor grant with expiry exactly equal to now → redirect (boundary is
  `expiresAt <= now`, matching the service; assert the boundary explicitly)
- contractor grant with `expiresAt === null` → redirect (`expired`)
- external grant, same four expiry cases
- an expired grant that was valid on the previous request → denied on this one
  (assert by advancing the fake clock, not by mutating the row)

Freeze time with `vi.useFakeTimers()` + `vi.setSystemTime()` and restore in
`afterEach` per `.claude/rules/testing.md`. Assert Sentry call counts as exact
numbers.

---

## 7. Phase E — PostHog experiments, and the permission/flag/experiment boundary

`resolveAccessContext` currently returns `experiments: {}` with a `TODO`. Close it.

Read `.claude/rules/feature-flags.md` first — all of it. Then note what the branch
already has: `apps/api` gained PostHog flag evaluation and a background sync
worker in the commits merged just before this branch was cut
(`apps/api/src/providers/posthog/flags.ts`, `apps/api/src/workers/feature-flag-sync.ts`).

### E.1 The boundary, restated

Your `.claude/rules/access-control.md` §"Permission, feature flag, experiment"
already draws this line. Hold it absolutely in the implementation:

- A **permission** answers _may this operator do this?_ It gates routes, handlers,
  and navigation. It is authorization.
- A **feature flag** answers _does this operator have this capability yet?_ It
  gates navigation and may gate a route. It is availability.
- An **experiment variant** answers _which of several equivalent presentations
  does this operator see?_ It is **presentation only.** A variant must **never**
  gate a route, a handler, a permission, or the visibility of a navigation entry.

The last point is the one to enforce mechanically, because it is the one that
will be violated by someone in six months looking for a quick A/B on a feature's
availability.

### E.2 What to build

1. Populate `experiments` in `resolveAccessContext` from the multivariate flag
   assignments the platform already returns, keyed by flag key → variant string.
   Read how `apps/console/src/lib/features.ts` obtains flag state today and follow
   that path — do **not** call PostHog directly from Console
   (`.claude/rules/feature-flags.md`: _"Do not evaluate flags client-side"_, and
   apps evaluate through the platform, never the provider).
2. An experiments failure must degrade exactly like features already do: an
   outage yields `{}` and never discards permissions. Your existing try/catch
   around features is the model.
3. Add a `variant(context, key, fallback)` helper to
   `packages/core/src/access/context.ts` beside `can` and `hasFeature`, returning
   the assigned variant or the fallback. Export it from
   `packages/core/src/access/index.ts`.
4. **Add a type-level and test-level guard that a variant cannot gate anything.**
   `NavRequirement` in `packages/core/src/access/navigation.ts` must **not** gain
   an `experiment` field, and `route-permissions.ts` must not accept one. Add a
   test asserting `NavRequirement`'s accepted keys are exactly
   `permission | feature | anyPermission`, and a test asserting `resolveNavigation`
   ignores an experiment assignment entirely — same visible hrefs whether the
   context carries experiment variants or not.

### E.3 Document it

Extend `.claude/rules/access-control.md` §"Permission, feature flag, experiment"
with the three-line decision procedure and one worked example per kind drawn from
Console's real keys — e.g. `console:security` (permission), `console_widgets`
(feature), and a hypothetical named-variant experiment. Follow the app-prefixed
`<app>_<group>_<child>` key standard from `.claude/rules/feature-flags.md` for the
example key; do not invent an unscoped one.

---

## 8. Phase F — the two documentation gaps

### F.1 The root `CLAUDE.md` pointer

You declined to rewrite the whole blob through the contents API for one line.
That was sound judgement. Do it now with a **surgical** edit: under
`## Required Context`, after the `.claude/rules/api-access.md` bullet, insert
exactly one bullet:

```
- Read `.claude/rules/access-control.md` before changing permissions, roles,
  access context, navigation gating, route guards, or any authorization
  decision in any app. It is the platform standard every product app follows.
```

Change nothing else in that file. If your tooling cannot do a partial edit
safely, say so in the report and leave it — the orchestrator will apply it. **Do
not** reconstruct the file by hand.

### F.2 Mirror the rule

Root `CLAUDE.md` requires shared rules to exist in all three trees. The previous
brief told you not to mirror; that exception is now **lifted** for this rule,
because it has stabilised. Copy `.claude/rules/access-control.md` to:

- `.agents/rules/access-control.md`
- `.grok/rules/access-control.md`

with relative links rewritten to `.agents/rules/` and `.grok/rules/`
respectively. Do **not** copy `cli.md` or `advisor.md` anywhere — those exclusions
still stand.

---

## 9. Test floors — below these, the phase is incomplete

| Phase              | Minimum new `it()` cases                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A — route binding  | **30** (5 binding/filesystem assertions, 4 per-role reachability, 1 per newly guarded subtree asserting a denied role redirects and a permitted role renders — 7 subtrees × 2 = 14, plus 7 asserting the guard is present)                                                                                                                                                                                                           |
| B — guard sweep    | **12** (handler sweep, allow-list integrity, stale-exemption, page sweep, plus 8 on the `/api/audit-events` session requirement: unsigned → 401, signed → 200, malformed body → 400, attribution uses the session id, no admin call on 401, exact call counts)                                                                                                                                                                       |
| C — staff position | **14** (map built once, single call asserted with `toHaveBeenCalledTimes(1)`, unset env skips the call, null `user_id` skipped, null `job_title` skipped, staff resolves from the map, staff missing from the map renders an em dash, contractor uses grant title, external uses grant title, staff never reads grant title, error degrades with a notice, page stays functional on error, no per-row call, parallel not sequential) |
| D — affiliation    | **25** (the guard list in §6.3 is 16 on its own; plus 9 on the role cap: each affiliation × each role boundary, on both create and update, including the update-changes-affiliation case)                                                                                                                                                                                                                                            |
| E — experiments    | **16** (variant helper: hit, miss with fallback, empty map, malformed value; context: populated, outage → `{}`, outage preserves permissions; navigation: variants ignored, `NavRequirement` key set, no experiment gating; plus resolution wiring)                                                                                                                                                                                  |
| F — docs           | 0                                                                                                                                                                                                                                                                                                                                                                                                                                    |

These are floors, not targets. Where a behaviour has a boundary, test the
boundary. Where a guard exists, test that it blocks **and** that it permits.

---

## 10. Report format

Write `.claude/reports/gpt-web/2026-08-29-console-access-control-phase-2.md`
with the same honesty as your last one — it was genuinely useful, and the
sections where you refused to claim unverified work were the most valuable parts.

Required sections:

1. **Summary** — what the branch now contains, in prose.
2. **Per-phase status table** — phase, status (complete / partial / skipped),
   files touched, and the **actual count of `it()` cases you wrote in this pass**.
   Count them. Do not estimate, and do not report a pre-existing suite's size as
   your own work.
3. **Every file changed**, one line each, saying what changed and why.
4. **Any migration**, with its exact path and full SQL. If none, say none.
5. **Decisions the brief did not settle**, and what you chose.
6. **Things you could not verify** — you executed nothing, so this section
   exists; be specific about what a reader must not assume.
7. **Gaps deliberately left**, with the reasoning.
8. **Risk notes** — anything a reviewer should look at hardest.
9. **Verification the orchestrator must run** — the exact commands.

If a phase's premise turns out to be wrong when you read the code — a file that
does not exist, a facade verb that does not behave as this brief claims — **stop
that phase, do the others, and say so plainly in §5 and §7.** A brief is not
evidence. The last brief asserted no batch employee-profile verb existed and you
correctly did not invent one; this brief asserts one does, and you should verify
that before building on it.

---

## 11. Coordination — another agent is working in the same tree

A second agent is concurrently adding tests and touching files under
`apps/console/src/app/(app)/settings/users/` (including `layout.tsx`,
`_components/`, and the list page) and adding `*.weird.test.ts` /
`*.advanced.test.ts` files under `apps/console/src/` and `packages/core/src/access/`.

Therefore:

- **Pull the branch immediately before you start and again before your final
  commit.** Its contents will have moved.
- **Never delete or rewrite a `*.weird.test.ts` or `*.advanced.test.ts` file.**
  They are not yours.
- In the `settings/users/` subtree, **read the current file and integrate**;
  do not replace a file wholesale with your own version.
- If you hit a genuine conflict you cannot resolve without guessing, leave that
  file alone and describe the conflict in §7 of your report.

---

## 12. Verification the orchestrator will run

Write code that survives these. They will be run in the foreground, and a failure
is the orchestrator's to fix, but a phase that fails them wholesale will be sent
back.

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any" <every path you touched>
```

Plus, manually: sign in as each of `staff`, `admin`, `owner`, `super_admin` and
confirm that for every section, the sidebar's decision and the URL's decision
**agree** — which is the entire point of Phase A.
