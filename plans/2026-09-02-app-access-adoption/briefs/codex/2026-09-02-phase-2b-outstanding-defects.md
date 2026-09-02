# Phase 2b — three outstanding defects

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876`. **Branch:** `feature/app-access-adoption` — already checked out. Do not create, switch, merge, rebase, or delete any branch. **Do not commit.**

Three independent, bounded defects found during this run. They touch three different
workspaces and do not interact.

## Read first (binding)

- `.claude/rules/testing.md` — the prime directive: every test must be able to fail.
- `.claude/rules/express-api.md` — module layering; only a repository imports Prisma.
- `.claude/rules/naming.md` — durable identifiers are contracts.
- `.claude/rules/code-style.md`.

---

## Defect 1 — Billing's role editor cannot grant two permissions its API enforces

**Verified:** `apps/billing-api/src/modules/access/access.schemas.ts` declares **30**
permission values. `apps/billing/src/types/permission-values.ts` declares **28** —
it is missing `payment_methods:read` and `payment_methods:write`.

Those two exist deliberately. The API schema's own comment says why: *"Handling a
stored instrument is a different sensitivity from recording a receipt: a bookkeeper
can reconcile payments without being able to attach or detach a customer's card."*
So a Billing workspace can hold a role the API honours but the UI cannot express or
edit — and re-saving such a role through the editor would silently strip it.

**Fix, in `apps/billing` only:**

1. Add `'payment_methods:read'` and `'payment_methods:write'` to
   `BILLING_PERMISSION_VALUES` in `apps/billing/src/types/permission-values.ts`,
   positioned to match billing-api's ordering (after `payments:write`).
   **Keep the snake_case spelling.** These are durable persisted values already
   stored in `billing_roles.permissions`; renaming them is a coordinated migration,
   not part of this fix. (The canonical dot-delimited catalog spells the module
   `payment-methods`; that is a different, not-yet-adopted contract.)
2. Add both to `PERMISSION_GROUPS` in `apps/billing/src/lib/permissions.ts` so the
   role editor can pick them. Put them in whichever existing group holds
   `payments:*`; give them clear labels (e.g. "View payment methods", "Manage
   payment methods"). `apps/billing/src/lib/permissions.test.ts:150` already asserts
   that the groups cover every declared value — that assertion must keep passing
   without being weakened.
3. Confirm `togglePermission`'s read/write dependency rule behaves for the new pair:
   granting `payment_methods:write` must also grant `payment_methods:read`, and
   revoking `:read` must revoke `:write`. Add a test for exactly that pair.

**Do not** change `apps/billing-api`. Its list is the source of truth here.

Add a short comment above the new values recording that billing-api is authoritative
and that this duplication is removed when Billing moves onto the platform
app-access plane.

**Tests: at least 4 new `it()` cases**, covering the toggle pair in both directions,
that both values are members of the enum, and that the group coverage assertion
still holds.

---

## Defect 2 — a stale magic number fails `@876/core` on `main`

**Verified:** `packages/core/src/lib/phone.test.ts:151` asserts
`expect(codes.length).toBe(32)` while `listDialCodes()` now returns **41**. Commit
`0b222568 feat(ui): identify country-specific dial codes` added entries and did not
update the count. This fails on `origin/main` today — confirmed by stashing — so it
is pre-existing, not caused by this run.

**Fix:** the count is a brittle assertion that says nothing about correctness. Do
**not** simply change 32 to 41. Replace it with assertions that would actually catch
a regression:

- the list is non-empty;
- every entry has a flag, a name longer than one character, an ISO-3166 alpha-2
  `countryCode`, and a `dialCode` matching `/^\+\d+$/` (these already exist — keep
  them);
- the exact sorted list of `countryCode` values is pinned as a snapshot array, so
  adding or removing a country is a deliberate edit rather than a silent drift.

Keep the neighbouring "sorted alphabetically and de-duplicated" test as it is.

**Tests: net new assertions, not a relaxed one.** The file must fail if a country is
removed.

---

## Defect 3 — a two-node dependency cycle in `apps/api`

**Verified:** `apps/api/src/services/provisioning-catalog.ts:3` imports
`validateAppRoleProvisioningResources` from `./app-role-provisioning-catalog`, and
`app-role-provisioning-catalog.ts:7` imports from `./provisioning-catalog`. Each
file imports the other.

`pnpm --filter @876/api boundaries` currently reports **19** violations, all
`no-circular`. This pair is one of them and is the only one small enough to fix
safely in isolation.

**Fix:** extract whatever `app-role-provisioning-catalog.ts` needs from
`provisioning-catalog.ts` (or vice versa) into a third leaf module beside them, and
have both import the leaf. Follow the pattern already established in
`apps/api/src/modules/app-access/app-access-role-templates.service.ts`: a small file
with a comment saying which cycle it exists to break.

Do **not** move business logic between layers, and do not change any function's
behaviour or signature.

**The other 18 cycles are out of scope.** They are a pre-existing knot spanning
`services/provisioning`, `services/workspace`, and the organizations and memberships
module barrels; untangling them requires deciding which direction each edge should
point, which is not a mechanical change. Report the number you end at; do not
attempt them.

**Tests:** no new behaviour, so no new behavioural tests are required. The existing
`apps/api` suite must stay green.

---

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.**
- Do not weaken or delete an existing assertion to make a suite pass. If one is
  genuinely wrong, fix the code instead, or say so in the report.
- Do not rename any persisted permission value.
- Do not touch `packages/access-ui`, `packages/ui`, `apps/crm`, `apps/invoice`,
  `apps/console`, or anything under `apps/*/src/lib/auth/`.
- Do not touch `apps/billing-api`.
- Do not run `git commit`, `git push`, or any branch operation.

## Verification you must run and report

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api boundaries
```

`boundaries` exits non-zero while any cycle remains — that is expected. Report the
violation **count** before and after your change.

## Report

Write `plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-2b-outstanding-defects.md`
with a per-defect section: what you changed and why, the counted number of `it()`
cases added, the output tail of every command, the boundaries count before and
after, anything you could not do and why, and anything that contradicts this brief.
