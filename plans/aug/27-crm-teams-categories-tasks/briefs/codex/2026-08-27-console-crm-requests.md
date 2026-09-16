# Brief — Bring CRM requests/tasks/reminders into Console at the operator tier

## Context you must read first

- `.claude/rules/access-tiers.md` (NEW, this branch) — the operator/integration/session
  model. Console is **operator tier**: it uses its own internal key, never an
  integration credential.
- `.claude/rules/app-api-routing.md` (NEW, this branch) — Console's browser routes are
  named after what the **operator acts on**, so these are
  `/api/organizations/[id]/requests`, NOT `/api/crm/requests`.
- `.claude/rules/api-access.md`, `.claude/rules/sdk-conventions.md`,
  `.claude/rules/app-layout.md`, `.claude/rules/data-loading.md`,
  `.claude/rules/app-structure.md`, `.claude/rules/testing.md`.

## Goal

Console can view and manage an organization's CRM **requests**, and each request's
**tasks**, **reminders** and **notes**, from a new `Requests` tab on the
organization detail page. No new business logic anywhere: `apps/crm-api` already
implements every capability, org-scoped, behind `requireInternal`
(`/v1/organizations/:organizationId/requests…`), and `@876/crm` already wraps all
of it (`packages/crm/src/resources/*.ts`). Your job is wiring + UI, not new domain code.

Reference for how Console already consumes another service's admin client:
`packages/client/src/composers/console.ts` (couriers/widgets/billing), and
`apps/crm/src/lib/876.ts` for the CRM env var names (`CRM_API_URL`,
`CRM_INTERNAL_KEY`).

## Files you own (do not touch anything else)

- `packages/client/src/internal/types.ts`
- `packages/client/src/composers/console.ts`
- `packages/client/src/*.test.ts` (add/extend console surface tests)
- `apps/console/src/lib/876/index.ts`
- `apps/console/.env.example`
- `apps/console/src/lib/client/requests.ts` (new) and `apps/console/src/lib/client/index.ts`
- `apps/console/src/app/api/organizations/[id]/requests/**` (new)
- `apps/console/src/app/(app)/orgs/[slug]/requests/**` (new)
- `apps/console/src/app/(app)/orgs/[slug]/_components/org-tabs.tsx`

Do NOT touch `apps/crm`, `apps/crm-api`, `apps/billing`, `apps/invoice`,
`packages/crm`, or any other composer.

## Work

### 1. Facade wiring

- In `internal/types.ts`, add `crm: CrmClientOptions` to
  `ConsoleServerClientOptions['services']` as a **required** key (Console must be
  configured for CRM, exactly as it is for couriers/storage/widgets).
- In `composers/console.ts`, resolve `requireCapability(services.crm, 'crm')` and add
  to the `$876` surface, following the naming already used by
  `composers/crm.ts` so the two surfaces agree:
  `requests`, `requestTasks`, `requestReminders`, `requestNotes`,
  `requestCategories`. Do **not** add `teams` or `customerProfiles` — Console
  already surfaces org members and finance customers, and a second vocabulary for
  the same thing is the drift this must avoid.
- In `apps/console/src/lib/876/index.ts`, add a `getCrmOptions(requestId)` helper
  matching the existing `getWidgetsOptions` shape, reading `process.env.CRM_API_URL`
  and `process.env.CRM_INTERNAL_KEY`, and pass it through `getConsoleOptions`.
- Add the two vars to `apps/console/.env.example`, beside the couriers block, with
  a one-line comment saying CRM_INTERNAL_KEY must match the crm-api service value.

### 2. Console API routes (Pattern A, typed resource routes)

All under `apps/console/src/app/api/organizations/[id]/requests/`. Every handler:
`requireConsolePermission(...)` first, then resolve `requestId`, then
`createConsole876Client(requestId)`, then exactly one `$876` verb, then
`apiJson({ data })` / `apiJson({ error }, { status })`. No logic beyond that.
Copy the exact shape of
`apps/console/src/app/api/organizations/[id]/customers/route.ts`.

Permissions: use `'console:organizations'` for reads and writes, matching the
sibling org-scoped routes. Confirm that string against
`apps/console/src/lib/auth/route-guard.ts` and `src/lib/permissions.ts` before using it.

Routes:

| path                                                   | verbs                  |
| ------------------------------------------------------ | ---------------------- |
| `requests/route.ts`                                     | GET (list), POST       |
| `requests/[requestId]/route.ts`                         | GET, PATCH, DELETE     |
| `requests/[requestId]/tasks/route.ts`                   | GET, POST              |
| `requests/[requestId]/tasks/[taskId]/route.ts`          | PATCH, DELETE          |
| `requests/[requestId]/reminders/route.ts`               | GET, POST              |
| `requests/[requestId]/reminders/[reminderId]/route.ts`  | PATCH, DELETE          |
| `requests/[requestId]/notes/route.ts`                   | GET, POST              |
| `requests/[requestId]/notes/[noteId]/route.ts`          | PATCH, DELETE          |

Mirror the filter query params the CRM client's `requests.list` already accepts
(`status`, `teamId`, `assigneeId`, `customerId`, `categoryId`, `subcategoryId`,
`ownerId`, `priority`) — read them off `request.nextUrl.searchParams` and forward
only the ones present. Read the actual signatures in
`packages/crm/src/resources/*.ts`; do not guess argument order.

### 3. Console typed browser client

`apps/console/src/lib/client/requests.ts`, following the existing modules
(`orgs.ts`, `features.ts`) exactly — same `request` helper, same result shape.
Mutations only (create/update/delete for requests, tasks, reminders, notes).
Register it in `src/lib/client/index.ts`. Reads are server-rendered.

### 4. Console UI

- Add `{ label: 'Requests', href: `${base}/requests` }` to `org-tabs.tsx`, placed
  after `Customers`.
- `apps/console/src/app/(app)/orgs/[slug]/requests/(list)/page.tsx` — the list.
  Follow the org `customers` tab (`.../orgs/[slug]/customers/(list)/`) for
  structure, and `.claude/rules/app-layout.md` for the toolbar/status-filter and
  the table cell hierarchy. Status filter via `StatusFilterHeading` from
  `@876/ui/status-filter-heading`, threaded into the list call — never filtered
  client-side.
- `apps/console/src/app/(app)/orgs/[slug]/requests/[requestId]/page.tsx` — request
  detail showing the request fields plus its tasks, reminders and notes.
- Per `.claude/rules/data-loading.md`: the page shell (toolbar, tabs, table
  column headers) renders synchronously; only the data component sits inside
  `<Suspense>`, with a `DataTableSkeleton` carrying the real column set. Do not
  make the page component `async` just to await `params` above the boundary.
- No wordy subheadings under headings (root `CLAUDE.md` → UI Copy). No green
  buttons. Add button label is the bare verb `Add`, `primaryVariant="info"`.
- Resolve the org id the way the sibling org tabs already do — read how
  `.../orgs/[slug]/customers` gets from `slug` to an org id and reuse that, do not
  invent a second resolution path.

### 5. Tests (required — this is not optional)

- `packages/client/src/admin-core-surface.test.ts` or a new
  `console-crm-surface.test.ts`: assert the Console `$876` exposes exactly the five
  CRM resources named above and does **not** expose `teams` or `customerProfiles`.
- Route tests for at least: list happy path (full body assertion, both `data` and
  `error`), a permission failure asserting the exact status, and one invalid-body
  400. Follow `.claude/rules/testing.md` — assert complete shapes, exact call
  arguments with `toHaveBeenCalledWith`, and `not.toHaveBeenCalled()` on the guard
  failure path.

## Hard constraints

- **No `eslint-disable` comments anywhere.** No `as any`. If a type does not fit,
  fix the type.
- No business logic in route handlers. No `fetch` to a service origin from Console.
- Do not create barrel `index.ts` files that re-export directories (except the
  existing `src/lib/client/index.ts` composition, which is a declared entry point).
- Do not commit. Leave the working tree dirty; the orchestrator commits.

## Verify before reporting done

```
pnpm --filter @876/client typecheck && pnpm --filter @876/client test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

Report the exact test counts before and after, and paste any command that failed.
