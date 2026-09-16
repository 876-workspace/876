# CRM API — finish the polish and write the five missing tests

Small, precise follow-up. Scope is **`apps/crm-api/` only**, and within it just three
source files plus two new test files. Another Codex run is working in `packages/` right
now — do not touch anything outside `apps/crm-api/`.

`src/modules/teams/teams.service.ts` is the **reference for this task**. It was cleaned up
correctly: derived row types (`type TeamRow = Awaited<ReturnType<typeof repository.list>>[number]`),
real names (`requireTenant`, `serializeMember`), blank lines between logical groups, no
`any`. Bring the other two files up to it.

## 1. `src/modules/categories/categories.service.ts`

Its types are fine now, but the style pass was skipped. It still reads:

```ts
const t = await tenant(org)
if (!(await r.retrieve(t.id, id))) return null
if (await r.used(t.id, id)) throw crmError('crm/category-in-use')
```

Fix, matching `teams.service.ts` exactly:

- `import * as repository from './categories.repository.js'` — not `r`.
- `requireTenant(organizationId)` — not `tenant(org)`; and the local is `tenant`, not `t`.
- `serializeCategory` / `serializeSubcategory` — not `cat` / `sub`.
- Parameters are `organizationId`, `categoryId`, `subcategoryId` — never single letters.
- `.claude/rules/code-style.md` Rule 2: a blank line between the tenant guard, the
  load-and-check, the mutation, and the return; and a blank line **between** exported
  functions, which are currently jammed together with none.
- A one-line JSDoc on each exported function where the intent is not self-evident. In
  particular, say on `remove` **why** an in-use category is refused rather than nulled:
  categories are a reporting dimension, and retroactively erasing one corrupts the history
  of every request that used it. Archiving is the supported retirement path.

## 2. `src/modules/requests/requests.tasks.service.ts` and `requests.tasks.repository.ts`

Same treatment. Keep the behaviour exactly as it is — the `DONE` transition already stamps
`completedAt`/`completedBy` and clears both on the way out, which is correct. Only names,
spacing, and comments change.

Add a short comment on the `DONE` branch explaining that the stamp is cleared when a task
leaves `DONE`, mirroring how `requests.service.update` handles `resolvedAt`/`closedAt`, so
the two cannot drift.

## 3. The five tests that are still missing

`src/modules/requests/__tests__/requests.test.ts` now has 11 tests and covers the
assignment and category-default rules well. Leave it alone.

Create **two new test files**, both following that file's harness exactly — `vi.hoisted`
mocks for the repository and `tenants.service`, an `express()` app mounting the real
router, `fetch` against an ephemeral port, `vi.clearAllMocks()` in `beforeEach` with
default mock values set there.

### `src/modules/categories/__tests__/categories.test.ts`

1. **Deleting a category that is in use is refused.** `repository.used` resolves truthy →
   the response is **409** and `body.error.code` is exactly `crm/category-in-use`, and
   `repository.remove` was **not** called (`expect(repository.remove).not.toHaveBeenCalled()`).
2. **Deleting an unused category succeeds** — `repository.used` resolves falsy → 200, and
   `repository.remove` was called once with the exact `{ id, deletedBy }` arguments.
3. **A subcategory in use is refused** the same way with `crm/subcategory-in-use`.
4. **Creating a category derives its slug from the name** — posting `{ name: 'Billing & Refunds' }`
   calls `repository.create` with `slug: 'billing-refunds'`. Also assert the request body's
   `icon` is passed straight through, unvalidated.
5. **The list response is the full envelope** —
   `{ object: 'list', data: [...], has_more: false, total_count: 1, url: '...' }`, asserted
   as a whole object, not field by field.

### `src/modules/teams/__tests__/teams.test.ts`

6. **Adding a member who is already on the team updates the role rather than erroring** —
   `repository.upsertMember` is called once with the exact
   `{ tenantId, teamId, userId, role, addedBy }`, and the response is 200/201 with an
   `object: 'team_member'` body. (`upsertMember` is the repository's upsert; the service
   must not branch on existence itself.)
7. **Creating a team with `isDefault: true` passes it through to the repository**, which
   owns the clear-the-previous-default transaction. Assert the exact `create` arguments
   including the derived `slug`.
8. **Deleting a team calls `repository.remove` with the tenant id**, since the repository's
   transaction needs it to null the team off live requests and off category
   `defaultTeamId`. Assert the exact arguments.
9. **A team that does not exist answers 404** with the exact `crm/team-not-found` code (or
   whatever the routes actually answer — check `teams.controller.ts` and assert what is
   true there, do not invent a code).
10. **The team list response is the full envelope**, asserted as a whole object.

Assert complete shapes and exact arguments throughout. `toBeDefined()` alone is not a test,
and `toHaveBeenCalled()` without arguments is not either.

## Verification — foreground, and read the output

```
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
npx prettier --write "apps/crm-api/src/**/*.ts"
```

The test run must report **21 or more** tests across **three** files. `grep -rn "eslint-disable" apps/crm-api/src/modules/`
must stay empty, and `grep -rn ": any" apps/crm-api/src/modules/` must stay empty.

Prettier in this repo has no parser for `.prisma` or `.sql` — only format `.ts`.

**Do not commit anything.**
