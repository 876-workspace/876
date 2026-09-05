# Brief: harden the Console team PATCH route and finish the grant editor

You are fixing defects found in review of the uncommitted Console member-CRUD
work on branch `fix/console-member-crud`. Work only in `apps/console`.

Read first: `.claude/rules/access-control.md`, `.claude/rules/app-layout.md`
(§10a form-field anatomy), `.claude/rules/testing.md`, and the root
`CLAUDE.md` "UI Copy" section.

Do NOT commit. Do NOT touch any file outside the list in each task.

---

## Task 1 (CRITICAL — security regression). Constrain `roleName` on PATCH.

**The defect.** `teamGrantUpdateSchema` in `apps/console/src/types/team.ts`
declares `roleName: z.string().trim().min(1).optional()` — any non-empty
string. The `PATCH` handler in `apps/console/src/app/api/team/[id]/route.ts`
calls `assertTeamGrantChangeAllowed`, which (unlike `assertRoleChangeAllowed`)
never checks the value against `ASSIGNABLE_ROLES`. It flows straight into
`service.team.update` → `prisma.member.update({ data: { roleName } })`.

Two consequences:

1. **Privilege escalation.** `Member.roleName` is a FK to `Role.name`, and
   `Role.permissions` is an arbitrary `String[]`. `POST /api/roles` is gated
   only by `console:settings` (which `admin` holds) and stores the submitted
   permissions verbatim with no subset check. So an `admin` can create a custom
   role carrying `console:danger-zone` / operator-exclusive permissions and
   then assign it to another member through this new PATCH route. The existing
   super-admin guard in `evaluateTeamGrantChange` only compares against the
   literal name `super-admin`, so a custom high-privilege role slips past it.
   Before this branch there was no PATCH route and every role change went
   through `assertRoleChangeAllowed`, which enforces `ASSIGNABLE_ROLES`. This
   branch therefore regresses the escalation invariant its own plan requires.
2. **Unhandled 500.** A role name with no `Role` row violates the FK and throws
   an unhandled Prisma error instead of returning a validation error.

**The fix.** Constrain `roleName` to the assignable set at the contract
boundary, so both problems disappear at once.

- In `apps/console/src/types/team.ts`, type `roleName` against
  `ASSIGNABLE_ROLES` from `@/types/role` (e.g. `z.enum(ASSIGNABLE_ROLES)`),
  keeping it `.optional()`. Preserve the existing `canonicalConsoleRole`
  legacy-alias behaviour: `super_admin` must still be accepted and normalised
  to `super-admin` rather than rejected. If accepting the alias in the schema
  is awkward, normalise before parse — but do not silently drop the alias.
- In the PATCH handler, when the parse fails specifically because of
  `roleName`, return the existing registry error `team/role-invalid` (400,
  already defined in `apps/console/src/lib/errors/team.ts` and currently
  unused) rather than the generic `error/bad-request`.
- Do not weaken any existing guard. `assertTeamGrantChangeAllowed` keeps its
  self-protection, super-admin escalation, and target-protection checks.

**Files:** `apps/console/src/types/team.ts`,
`apps/console/src/app/api/team/[id]/route.ts`, plus tests below.

**Tests** (`apps/console/src/app/api/team/[id]/route.test.ts`) — add at minimum:

- PATCH with `roleName: 'wizard'` returns 400 `team/role-invalid` and
  `service.team.update` is NOT called (assert `not.toHaveBeenCalled()`).
- PATCH with `roleName: 'super_admin'` (legacy alias) is accepted and
  normalised — assert the exact value passed to `service.team.update`.
- Each of `user`, `staff`, `admin`, `super-admin` is accepted by the schema.
- The existing super-admin escalation denial still returns 403
  `team/role-forbidden`.

---

## Task 2. Remove the forbidden description paragraph.

Root `CLAUDE.md` → "UI Copy": no explanatory `<p>` under a section header.
`apps/console/src/app/(app)/settings/users/(team)/[id]/_components/grant-editor.tsx`
has exactly that under `<h3>Console Access</h3>`:

    Access changes apply to the member's next Console authorization check.

Delete that `<p>`. Leave the `<h3>` bare.

---

## Task 3. Use `FormRow` for the grant editor's fields.

`.claude/rules/app-layout.md` §10a: every labelled field in an edit form uses
`FormRow` from `@876/ui/form-row`, spacing comes from `Label` (never a
wrapper), required fields use `FormRow`'s `required` prop, and guidance goes in
`hint` (a tooltip) rather than text under the control.

In `grant-editor.tsx`, replace the hand-rolled
`<div className="space-y-1.5"><Label/>…</div>` wrappers with `FormRow`. Mark
expiry and justification `required` when `affiliation !== 'staff'` (the service
validation already enforces both — see `validateTeamGrant`). Read the existing
`FormRow` API before using it; do not invent props.

Keep the Save button `variant="info"`. Never introduce a green button.

---

## Task 4. Filter the role options by the caller's authority.

The role `Select` currently offers `super-admin` to every viewer, so a
non-super-admin picks it and gets a guaranteed 403. Pass the viewer's canonical
role into `GrantEditor` and omit `super-admin` from the options when the viewer
is not a super admin. The server guard stays exactly as it is — this is a UI
affordance change only, never the security boundary.

Update the caller in
`apps/console/src/app/(app)/settings/users/(team)/[id]/page.tsx`.

---

## Task 5. Real coverage for the grant editor.

`grant-editor.test.tsx` has only 2 `it()` cases for a six-field editor with
conditional branches. Per `.claude/rules/testing.md`, add cases that can
actually fail — assert exact call arguments with `toHaveBeenCalledWith`, exact
call counts, and negative space:

- switching affiliation to `contractor` reveals the expiry/title/justification
  fields; switching back to `staff` hides them and sends explicit `null`s.
- saving sends ONLY the changed fields (assert the exact object passed to
  `client.team.update`).
- saving with no changes does not call `client.team.update` at all.
- a failed update renders the error message and leaves the form mounted and
  editable (per `.claude/rules/error-handling.md` — the error must not replace
  the form).
- `canUpdate: false` disables the grant controls; `canSuspend: false` disables
  the status control; neither permission renders the explanatory fallback.
- `super-admin` is absent from the options for a non-super-admin viewer
  (Task 4).

---

## Verification (you run these; report exact output)

    pnpm --filter @876/console typecheck
    pnpm --filter @876/console lint
    pnpm --filter @876/console test

`src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx`
has ONE pre-existing failure (a vitest snapshot-state error) that is unrelated
to this work and was confirmed failing on a clean tree. Leave it alone. Every
other test must pass, and the total test count must go UP.

Do not add `eslint-disable`, `as any`, or `@ts-ignore` anywhere. Do not weaken
a production signature to make a test easier.

## Report

Write `plans/2026-09-05-console-member-crud/reports/codex/2026-09-05-team-patch-role-hardening.md`
with: per-task status, files changed and why, the COUNTED number of `it()` cases
added, verbatim verification output, and anything you could not verify.
