# CRM API — Phase A remediation

Phase A landed working code, but three of its modules do not meet the bar and the required
tests were not written at all. Scope is again **`apps/crm-api/` only**.

`src/modules/requests/requests.service.ts` and `requests.repository.ts` are **good** — the
team-change assignee rule, the category-default application, and the subcategory validation
are all correct. Leave their behaviour alone; only the two small items in §6 apply there.

The problems are in `modules/teams/`, `modules/categories/`, and
`modules/requests/requests.tasks.{service,repository}.ts`.

---

## 1. Delete every `eslint-disable`, and every `any`

Each new file opens with `/* eslint-disable @typescript-eslint/no-explicit-any */`. That is
why `pnpm lint` passed — the rule was switched off rather than satisfied. Remove the
directive from all eight files and remove every `any` with it. `.claude/rules/types.md`
does not permit this, and a silenced linter is worse than a failing one because it reports
success.

Type things the way `requests.service.ts` already does, which is the house pattern:

- **Serializer inputs** derive from the repository:
  `type TeamRow = NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>`.
  For a row loaded with relations, derive the with-members variant the same way from the
  repository function that includes them, so the serializer cannot drift from the query.
- **Service inputs** derive from the Zod schemas: `z.infer<typeof createTeamBodySchema>`,
  and live in `src/types/team.ts` / `category.ts` / `task.ts` next to the unions already
  there, per `.claude/rules/types.md`.
- No `as any`, no `as unknown as`, no implicit `any` parameters.

## 2. Write it like the rest of the service

`teams.service.ts` is currently one unbroken run of one-line arrow functions with
single-letter names (`t`, `x`, `m`) and no comments. Match `requests.service.ts` instead:

- Real names: `tenant`, `team`, `row`, `memberRow`. `requireTenant` for the guard, not `tenant`.
- `.claude/rules/code-style.md` Rule 2: one blank line between logical groups — the
  tenant guard, the load-and-check, the mutation, the return.
- A short JSDoc on each exported function saying what it does and why, where the why is not
  obvious. Do not narrate the obvious.
- Keep `function` declarations for exported service functions, not `const` arrows, matching
  the neighbouring modules.

## 3. Never swallow an error

`teams.service.ts` has two bare `catch { return null }` blocks around `updateMember` and
`removeMember`. That turns a database outage into a 404 and makes the failure
undiagnosable. Delete both.

Replace them with an explicit existence check — load the membership row first and return
`null` when it is genuinely absent, so a real error propagates to the error middleware and
becomes a logged 500, exactly as `.claude/rules/express-api.md` intends.

## 4. Deleting a team must not strand its references

`teams.service.remove` currently soft-deletes the row and stops. Two things then dangle:
requests still carrying `teamId`, and categories/subcategories still carrying
`defaultTeamId`.

Do all of it in **one `prisma.$transaction`** in the repository:

1. soft-delete (or hard-delete under `DELETION_MODE=hard`) the team,
2. `updateMany` its live requests to `teamId: null`,
3. `updateMany` categories and subcategories whose `defaultTeamId` is this team to `null`.

Comment why: a soft-deleted team is invisible to every read, so a request still pointing at
it would render a team that no longer exists.

## 5. The composite `onDelete: SetNull` is a data-integrity bug — fix it

`request.prisma` and `category.prisma` declare `onDelete: SetNull` on composite relations
whose first column is the **required** `tenantId`:

```
team        Team?               @relation(fields: [tenantId, teamId], ...,        onDelete: SetNull)
category    RequestCategoryDef? @relation(fields: [tenantId, categoryId], ...,    onDelete: SetNull)
subcategory RequestSubcategory? @relation(fields: [tenantId, subcategoryId], ..., onDelete: SetNull)
defaultTeam Team?               @relation(..., fields: [tenantId, defaultTeamId], onDelete: SetNull)  // ×2
```

PostgreSQL's `ON DELETE SET NULL` without a column list nulls **every** referencing column,
including `tenant_id` — which is `NOT NULL`. So deleting a team or a category raises a
not-null violation instead of clearing the reference. The generated migration has exactly
that form. It has not been applied anywhere yet, so fix it in place.

**Fix:** change all five relations to `onDelete: NoAction` in the Prisma schema, and the
corresponding constraints in the migration to `ON DELETE NO ACTION`. The service layer
already owns the clearing:

- team deletion clears its references in §4's transaction;
- category and subcategory deletion is **refused** while in use (`crm/category-in-use`,
  `crm/subcategory-in-use`), so `NO ACTION` is the correct database-level backstop and the
  friendly error is what a caller actually sees.

Leave a comment on each relation recording that the null-out is deliberate service
behaviour, not a missing cascade — otherwise someone will "fix" it back to `SetNull`.

Do **not** reach for PostgreSQL 15's `ON DELETE SET NULL (column)` form: Prisma cannot
express it, so schema and database would drift on the next `migrate diff`.

## 6. Two small fixes in `requests.service.ts`

- `update()` calls `repository.subcategoryExists(...)` twice for the same id — once to
  check existence, then again to read `categoryId`. Call it once, keep the row, and use it
  for both.
- Its serializer must include the new `icon` field on any category it embeds (see §7).

## 7. Categories and subcategories get an `icon`

Product requirement: a category carries an icon so the catalog reads at a glance — "Bugs"
with a bug on it. The icon is a **key from a closed catalog**, never free text and never a
component.

- Add `icon String?` to `RequestCategoryDef` and `RequestSubcategory`, `@map("icon")`.
- Add the column to the **existing** migration file (it is unapplied):
  `ADD COLUMN "icon" TEXT` on both tables.
- Accept `icon` in the create/update Zod bodies as
  `z.string().trim().max(40).nullable().optional()`, and serialize it.
- **Do not validate the key against a list in the API.** The catalog lives in
  `packages/ui/src/category-icons.tsx` and is a presentation concern; the UI narrows an
  unknown key to a fallback at render time. An API that rejected a key retired in a later
  UI build would make old rows unsavable. Say so in a comment.

## 8. The tests, which were not written

None of the ten tests the original brief required exist —
`src/modules/requests/__tests__/requests.test.ts` still has its original three. Write them
now, following `.claude/rules/testing.md` and that file's existing style (Supertest against
the assembled app, not controllers called directly).

1. Changing a request's team **clears** an assignee who is not a member of the new team.
2. Changing a request's team **keeps** an assignee who *is* a member of the new team.
3. `teamId: null` leaves the assignee untouched.
4. Creating with a category applies the category's `defaultTeamId` when the caller supplied
   none, and does **not** when the caller supplied one.
5. A subcategory from a different category is rejected with `crm/subcategory-category-mismatch`.
6. Deleting a category referenced by a live request fails with `crm/category-in-use`.
7. Setting `isDefault` on a second team clears it on the first.
8. Adding an existing team member updates the role rather than erroring.
9. A task moved to `DONE` stamps `completedAt`; moved off `DONE` clears it.
10. Deleting a team nulls `teamId` on its live requests **and** `defaultTeamId` on
    categories that pointed at it (§4).

Plus: every list response asserts the **full** `{object:'list', data, has_more, total_count, url}`
envelope, and every error test asserts the exact `code` and status. Assert complete shapes
and exact call arguments — `toBeDefined()` alone is not a test, and neither is
`toHaveBeenCalled()` without arguments.

## Verification — foreground, all of them, and read the output

```
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
npx prettier --write "apps/crm-api/**/*.{ts,prisma,sql}"
```

`lint` must pass **with no `eslint-disable` anywhere in `src/modules/`** — check with
`grep -rn "eslint-disable" apps/crm-api/src/` and show me it returns nothing.
`test` must report substantially more than the current 3 tests.

**Do not commit anything.** Do not touch any workspace other than `apps/crm-api/`.
