# Brief — repair the CRM app on `refactor/bounded-service-clients`

Model: `gpt-5.6-terra`, `model_reasoning_effort=high`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, rebase, merge or commit).

## Context

The branch replaces the `@876/client` mega-facade with bounded per-domain clients
(ADR `docs/architecture/020-bounded-service-clients-and-application-bffs.md`).
CRM was migrated by an agent that **could not execute anything**, so the app does
not compile. `pnpm --filter @876/crm-app typecheck` currently reports **135
errors**. Your job is to make CRM correct, compiling and tested.

CRM's composition roots already exist and are correct — **use them, do not change
their shape**:

- `apps/crm/src/lib/services/crm.ts` → `export const crm` (server-only, internal-key singleton)
- `apps/crm/src/lib/services/workspace.ts` → `export async function getWorkspace()` (request-scoped, signed-in user's bearer token)

`apps/crm/src/lib/876.ts` was deleted on purpose. Nothing may recreate it, and no
new barrel may aggregate several domains.

## The four defect classes

### 1. `Crm*`-prefixed type names do not exist on `@876/crm`

The old facade re-exported CRM contracts under `Crm*` aliases. That alias block is
still readable at **`packages/client/src/index.ts:53-139`** — it is the exact
source of truth for the mapping (e.g. `Customer as CrmCustomer`,
`UpdateRequestTaskInput as CrmRequestTaskUpdateInput`, `Team as CrmTeam`).

Fix by making **`apps/crm/src/types/crm.ts`** own the aliasing: re-export from
`@876/crm` with the same `X as CrmX` renames, so the ~100 CRM call sites that
already import `Crm*` from `@/types/crm` keep working. Do **not** rename symbols
across the app — that churn is out of scope for this pass.

Where a file imports a `Crm*` name **directly from `@876/crm`** (several modules
under `apps/crm/src/lib/client/`), change the import to come from `@/types/crm`
instead. Browser transports must not depend on the raw package's naming.

If a name in the old alias block has no counterpart in `@876/crm`, say so in your
report rather than inventing an export.

### 2. `crm.customerProfiles` does not exist

The facade projected `crm.customers` as `customerProfiles`
(`packages/client/src/composers/crm.ts:14`). Every `crm.customerProfiles.<verb>()`
call site must become `crm.customers.<verb>()`. Verify the argument order and
return shape against `packages/crm/src/resources/customers.ts` — do not assume
they match the old projection.

### 3. Implicit `any` fallout

Several `.map(department => …)`, `.map(member => …)`, `({ profile, customer }) => …`
callbacks lost their inferred parameter types once the facade type disappeared.
Fix them by making the **source expression** correctly typed. Do not add explicit
`any`, do not add `// @ts-expect-error`, and do not widen a parameter to `unknown`
and cast at use.

### 4. Seven route handlers still import the deleted facade

```
apps/crm/src/app/api/customers/route.ts
apps/crm/src/app/api/customers/[customerId]/route.ts
apps/crm/src/app/api/request-categories/[categoryId]/route.ts
apps/crm/src/app/api/request-categories/[categoryId]/subcategories/route.ts
apps/crm/src/app/api/request-categories/[categoryId]/subcategories/[subcategoryId]/route.ts
apps/crm/src/app/api/teams/[teamId]/members/route.ts
apps/crm/src/app/api/teams/[teamId]/members/[userId]/route.ts
```

They still do `const $876 = await get876Client()`. Migrate them to
`import { crm } from '@/lib/services/crm'` following the already-migrated siblings
(`apps/crm/src/app/api/teams/route.ts`, `apps/crm/src/app/api/request-priorities/route.ts`)
as the reference shape.

**Preserve, exactly:** the existing permission/session check, the actor identity
(`createdBy` / `completedBy` / `deletedBy` / `addedBy` …) being read from the
server session and never from the request body, the `{ data, error }` response
envelope, and the HTTP status codes. If a route reads Core organization/directory
data (departments, members, users), that call goes through `await getWorkspace()`
— never through the CRM internal key.

## One design defect to fix while you are here

`apps/crm/src/lib/services/crm.ts` **throws at module scope** when
`CRM_INTERNAL_KEY` is unset. OpenNext imports every route module during the
Cloudflare build, when runtime secrets are deliberately absent, so this fails the
build (see `.claude/rules/navigation-performance.md` Rule 4 — "construct the
adapter lazily"). Make the client lazily constructed on first use, keeping it a
singleton after that, and keep the missing-key error as a **runtime** failure with
the same message. Do not use a `Proxy` to hide the lifecycle.

## Hard "do not"

- Do not create a branch, commit, rebase, merge, or open a PR. Leave changes in the working tree.
- Do not add `eslint-disable` anywhere, and do not use `as any` (use `as unknown as T` only where a genuine type violation is intended and comment why).
- Do not touch `apps/console`, `apps/billing`, `apps/invoice`, `apps/couriers`, `apps/enterprise`, `apps/876`, or `packages/client`, `packages/sdk`, `packages/admin`.
- Do not modify `packages/workspace/**` — another change is in flight there.
- Do not weaken a production signature (optional `searchParams`, removed toolbar, loosened guard) to make a test easier.
- Do not delete or skip an existing test. If a test asserts behaviour that genuinely changed, update the assertion and say so in the report.

## Files you own

`apps/crm/**` and, only if a genuine missing export is the cause, `packages/crm/src/index.ts`
(add the export; do not rename existing ones).

## Verification — run all of these, in the foreground, and report real output

```bash
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
pnpm --filter @876/crm-app test
npx prettier --check "apps/crm/**/*.{ts,tsx}"
grep -rn "eslint-disable\|as any\|@876/client\|get876Client\|customerProfiles" apps/crm/src
```

The last grep must return **nothing**. `typecheck` must be at **0 errors**, not
fewer errors. Report the test count before and after — a green suite with fewer
tests than it started with is a failure.

## Report

Write `.claude/reports/codex/2026-08-30-crm-bounded-client-repair.md` containing:
the four defect classes and how each was resolved; every file changed with a
one-line reason; any `@876/crm` export you had to add and why; anything in the old
alias block with no counterpart; the verbatim final output of each verification
command; and anything you could not fix, stated plainly rather than worked around.
