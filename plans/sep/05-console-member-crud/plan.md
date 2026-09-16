# Implementation Plan: Console member CRUD completion

- **Run ID:** `2026-09-05-console-member-crud`
- **Branch:** `fix/console-member-crud`
- **Status:** COMPLETED ✅
- **Pull request:** [#481](https://github.com/876-workspace/876/pull/481)

## Goal

Complete Console-local access-grant administration so authorized operators can
create, view, edit, suspend, and revoke member grants without bypassing the
existing RBAC and role-escalation rules.

## Architectural scope

Console only (`apps/console`). Console access grants are **app-local
operational data** in Console's own Prisma datastore, per
`.claude/rules/platform-services.md` — they reference the core 876 user by
opaque ID and never duplicate identity tables. Authorization follows
`.claude/rules/access-control.md`: navigation visibility, route guard, and
route-handler authorization are all present, and hiding a control is never the
security boundary.

## Implementation

- Replace the permissions page's hardcoded read-only revoke state with a
  client-side mutation that calls the existing same-origin team route, shows
  pending and failure feedback, and returns to the team list after success.
- Add a member editor for the persisted Console grant fields: role, status,
  affiliation, expiry, justification, and non-staff title. Reuse the existing
  grant validation and role-cap policy through the Console service layer.
- Complete the typed browser client and protected `/api/team/:id` mutation
  surface. Require the matching `team:*` permissions and return canonical
  client envelopes.
- Centralize destructive role/grant safeguards so direct revocation cannot
  bypass the existing super-admin escalation check or let an operator change
  their own Console access.
- Change the revoke copy to describe the actual effect: deleting the Console
  access grant blocks future Console authorization checks. Do not claim that
  identity sessions are terminated unless a canonical session-revocation
  capability is wired.

## Key design decisions

- **Resulting-state validation on update.** `service.team.update` merges the
  stored grant with the patch and validates the _resulting_ affiliation/role
  combination, so an affiliation change alone cannot leave a `super-admin`
  grant on a `contractor` — the cap required by `access-control.md`.
- **One safeguard evaluator.** `evaluateTeamGrantChange` is shared by
  `assertRoleChangeAllowed` and `assertTeamGrantChangeAllowed`, so the
  self-access, super-admin escalation, and target-protection rules have exactly
  one definition site rather than one per entry point.
- **Revoke copy states the real effect.** Deleting the grant denies future
  Console authorization checks; it does not terminate an identity session, and
  the dialog no longer claims it does.
- **Role assignment is constrained at the contract boundary** (review fix): the
  PATCH schema accepts only `ASSIGNABLE_ROLES`, so an arbitrary or custom role
  name can never be persisted through the grant editor.

## Dispatched briefs

| Delegate                      | Task                                                    | Brief                                                                                                          |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| codex (`gpt-5.6-terra`, high) | PATCH role hardening + grant-editor rule/coverage fixes | [briefs/codex/2026-09-05-team-patch-role-hardening.md](./briefs/codex/2026-09-05-team-patch-role-hardening.md) |

## Execution reports

| Delegate | Report                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| codex    | [reports/codex/2026-09-05-team-patch-role-hardening.md](./reports/codex/2026-09-05-team-patch-role-hardening.md) |

## Task checklist

- [x] Permissions page revoke wired to the same-origin team route, with pending
      and failure feedback and post-success navigation.
- [x] Grant editor for role, status, affiliation, expiry, justification, title.
- [x] Typed browser client (`client.team.update` / `client.team.revoke`) and the
      protected `PATCH` / `DELETE` `/api/team/:id` surface.
- [x] Shared destructive-change safeguards (self-access, super-admin
      escalation, target protection).
- [x] Revoke copy corrected — no false session-termination claim.
- [x] **Review fix:** constrain `roleName` to `ASSIGNABLE_ROLES` on PATCH
      (escalation regression — see review findings below).
- [x] **Review fix:** remove the forbidden description paragraph under the
      grant editor's section header.
- [x] **Review fix:** move grant-editor fields onto `FormRow`.
- [x] **Review fix:** hide `super-admin` from the role options for a
      non-super-admin viewer.
- [x] **Review fix:** real grant-editor coverage (exact args, negative space).

## Review findings (2026-09-05)

1. **Role escalation regression (critical).** `teamGrantUpdateSchema.roleName`
   accepted any non-empty string, and the PATCH path called
   `assertTeamGrantChangeAllowed`, which — unlike `assertRoleChangeAllowed` —
   never checks `ASSIGNABLE_ROLES`. `Role.permissions` is an arbitrary
   `String[]` and `POST /api/roles` is gated only by `console:settings` (held by
   `admin`) with no subset check, so an admin could mint a custom role carrying
   danger-zone permissions and assign it through the new route. The super-admin
   guard compares only against the literal name `super-admin`, so the custom
   role slips past it. Before this branch every role change went through
   `assertRoleChangeAllowed`, so the branch regressed the invariant its own plan
   requires. A non-existent role name additionally violated the
   `Member.roleName → Role.name` FK and surfaced as an unhandled 500.
2. **UI copy.** A description paragraph sat under the grant editor's section
   header, which the root `CLAUDE.md` "UI Copy" rule forbids.
3. **Form anatomy.** The grant editor hand-rolled label/control wrappers
   instead of `FormRow`, against `app-layout.md` §10a, and did not mark expiry
   and justification required for non-staff affiliations.
4. **Dead-end affordance.** The role select offered `super-admin` to viewers
   who cannot assign it, guaranteeing a 403 round trip.
5. **Thin coverage.** The grant editor shipped 2 `it()` cases for a six-field
   editor with conditional branches.

Confirmed clean in review: no `eslint-disable`, no `as any`, no `@ts-ignore`;
`as unknown as` appears only in tests for deliberate type violations, which
`.claude/rules/testing.md` sanctions. `team:update` / `team:suspend` /
`team:revoke` are all in the Console catalog and granted to `admin` and
`super-admin` via `TEAM_MANAGE`, so no permission is declared without a grant.

## Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```

**Known pre-existing failure, unrelated to this branch:**
`src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx`
fails with a vitest snapshot-state error. Confirmed failing identically on a
clean tree (`git stash -u`), so it is not a regression from this work and is out
of scope here.

Baseline measured 2026-09-05: clean tree 1682 passed / 1 failed; this branch
1691 passed / 1 failed (+9 tests) before the review fixes.

## Outcome

All review findings were dispatched to codex and verified in the merged working
tree, then committed as seven focused commits on `fix/console-member-crud` and
opened as PR #481.

Final verification, run in the foreground on the committed tree:

- `pnpm --filter @876/console typecheck` — exit 0.
- `pnpm --filter @876/console lint` — 0 errors, 21 warnings, all pre-existing in
  unrelated files and none in the team surface.
- `pnpm --filter @876/console test` — 1705 passed, 1 failed. Clean-tree baseline
  was 1682 passed / 1 failed, so this work adds **+23 tests** and the only
  failure is the documented pre-existing billing snapshot error.
- `node scripts/check-app-structure.mjs` — OK.
- No `eslint-disable`, `as any`, or `@ts-ignore` anywhere in the changed files.

PR #481 reports `MERGEABLE` with no conflicts. Its five failing checks
(`chromium-smoke`, `component-tests`, `structure`, `widget-browser`, and the
Cloudflare `Workers Builds: 876-console`) fail identically on `main`, each in
about two seconds with no job log, which is the known signature of the disabled
workflows and the orphaned Cloudflare checks left behind by the move to Vercel.
They are unrelated to this branch.
