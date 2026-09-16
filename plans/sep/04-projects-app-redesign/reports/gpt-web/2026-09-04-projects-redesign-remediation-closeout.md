# 876 Projects redesign — GPT Web remediation closeout

Date: 2026-09-04  
Branch: `feat/projects-comments-and-mobile-redesign`  
Run: `2026-09-04-projects-app-redesign`  
Implementation head immediately before this report: `3ede5858c01ef6ac4e6560b8d996154c20ca5f07`

## 1. Scope and summary

This report covers the **final GPT Web closeout pass** that followed the broader
Projects redesign remediation. It starts from the branch state that already
contained the earlier correctness fixes for comments, mobile shell behavior,
custom-field creation, issue defaults, required custom-field validation, and
transactional issue/custom-field writes. This closeout finishes the one backend
invariant explicitly left incomplete by the prior pass, removes the remaining
copied CRM naming residue, reconciles the stale remaining-work report, and
records the verification boundary required by `.claude/rules/cli.md`.

The implementation is complete for the agreed redesign/remediation scope. The
remaining items are product extensions or performance work, not known
correctness blockers in the implemented flow.

GPT Web did **not** execute pnpm, Vitest, TypeScript, ESLint, Prisma, a database,
or a running service. Any historical green result in earlier reports predates
this closeout and must not be treated as verification of these commits.

## 2. Per-phase status and counted tests

The counts below are source-counted **net new `it()` cases added in this closeout
pass**, not executed test results.

| Phase | Status | Net new `it()` cases | Result |
| --- | --- | ---: | --- |
| A — default work-structure invariants | Implemented | 7 | First type/state becomes default; promotions are atomic; active defaults cannot be unset; default work-item type cannot be archived. |
| B — authoritative custom-field validation coverage | Implemented | 3 | Added direct service regressions for missing required fields, wrong type scope, and preserving an existing required value on partial update. |
| C — Projects navigation naming cleanup | Implemented | 0 | Replaced copied `isActiveCrmPath` vocabulary with `isActiveProjectsPath` in desktop/mobile shell code. |
| D — closeout documentation | Implemented | 0 | Reconciled the remaining-work document and added this GPT Web report. |
| **Total** | **Implemented** | **10** | **Source-counted only; not executed by GPT Web.** |

A pre-existing test that asserted clearing a previous default during creation
was rewritten to assert the new atomic default repository path. That replacement
is **not** included in the +10 net-new count.

## 3. What was finished in this closeout

### 3.1 Atomic and durable defaults

The prior remediation had introduced a bounded repository for default
transitions but had not wired it into the work-structure service. This pass
completed that integration.

The service now maintains these invariants for active work item types and
workflow states:

1. Creating the first active record automatically makes it the default, even
   when the caller does not send `isDefault: true`.
2. Explicitly promoting a new default clears the prior default and writes the
   replacement inside one Prisma transaction.
3. Updating the current default with `isDefault: false` is rejected rather than
   leaving the tenant with no default.
4. The default work item type cannot be archived. Workflow-state deletion
   already had the equivalent protection and retains it.
5. Issue creation therefore has a stable server-side default to resolve rather
   than depending on the browser form or literal `task`/`todo` keys.

The atomic repository takes `tenantId` explicitly. It no longer recovers a
string tenant ID from a generic Prisma create input with a cast.

### 3.2 Custom-field contract regressions

The owning work-structure service already enforced required fields and type
applicability after the earlier remediation. This closeout adds focused service
coverage for the authoritative rules themselves:

- an applicable required field missing from create is rejected with
  `projects/required-custom-field-missing` and its field key in `param`;
- a value for a custom field scoped to another work item type is rejected;
- an existing persisted required field remains valid when a partial issue update
  omits that field rather than incorrectly treating omission as deletion.

### 3.3 Projects-specific navigation vocabulary

`apps/projects/src/components/shell/nav-link.tsx` still exported
`isActiveCrmPath`, a copied CRM name for otherwise generic path matching.
The helper is now `isActiveProjectsPath`, and `mobile-nav.tsx` uses the renamed
Projects helper. No compatibility alias was kept because both known call sites
are inside the Projects shell and are updated together.

### 3.4 Remaining-work reconciliation

`reports/codex/2026-09-04-remaining-work.md` previously said the focused tests
and typecheck passed before the later remediation existed. That statement was
misleading for the branch's current head. The report now distinguishes:

- correctness defects resolved by the remediation;
- genuine post-redesign product enhancements; and
- verification that still must run on the current head.

## 4. Earlier remediation already present when this closeout began

The following fixes were already committed on this branch before the final
closeout began. They are recorded here for a complete architectural handoff but
are **not** included in the +10 test count above.

- New-issue custom-field applicability compares `CustomField.typeIds` with the
  selected `WorkItemType.id`, not with a type key.
- Custom-field settings use an explicit `text` default and support creation-time
  select/multi-select options, required flags, and work-item-type bindings.
- Empty work-item-type PATCH bodies no longer inherit the create schema's
  `hierarchyLevel` default and are rejected as empty updates.
- Issue creation resolves explicit state/type inputs first, then persisted
  project/tenant defaults, instead of hard-coded `todo`/`task` literals.
- A persisted `Project.defaultWorkItemTypeId` is honored by issue creation.
- Required custom fields and work-item-type applicability are validated in the
  Projects API for browser, SDK, and MCP/service callers.
- Custom-field writes during issue create/update use the issue transaction's
  Prisma client so a field write failure rolls back the issue mutation instead
  of leaving a partial success.
- Mobile Projects header no longer renders the search control twice.
- `IssueComments` reconciles refreshed `comments` props and surfaces delete
  failures instead of swallowing them.
- Comment update/delete author ownership is enforced by the Projects API. The
  Projects host injects the authenticated user ID; the browser cannot choose the
  actor ID.
- The Projects SDK transports the actor identity needed by the trusted host/API
  boundary for comment update/delete.

## 5. Files changed in this closeout pass

| File | Change and reason |
| --- | --- |
| `apps/projects-api/src/modules/work-structure/work-structure-defaults.repository.ts` | Refined the atomic default-transition repository to take `tenantId` explicitly and avoid deriving it from a generic Prisma create input. |
| `apps/projects-api/src/modules/work-structure/work-structure.service.ts` | Wired atomic default create/promote operations into the service; made the first type/state default; rejected unsetting/archiving active defaults. |
| `apps/projects-api/src/http/errors.ts` | Clarified default-required messages so the same error accurately covers delete and unset attempts. |
| `apps/projects-api/src/modules/work-structure/__tests__/work-structure.service.test.ts` | Mocked the bounded default repository, updated transaction-aware expectations, and added 10 net-new invariant/custom-field regression cases. |
| `apps/projects/src/components/shell/nav-link.tsx` | Renamed the copied CRM active-path helper to Projects vocabulary. |
| `apps/projects/src/components/shell/mobile-nav.tsx` | Updated the mobile shell to consume `isActiveProjectsPath`. |
| `plans/2026-09-04-projects-app-redesign/reports/codex/2026-09-04-remaining-work.md` | Reconciled resolved defects, real follow-ups, and current unverified status. |
| `plans/2026-09-04-projects-app-redesign/reports/gpt-web/2026-09-04-projects-redesign-remediation-closeout.md` | Required GPT Web implementation/verification handoff report. |

## 6. Migration

**No migration was created or modified in this closeout pass.**

The existing work-structure migration belongs to the earlier implementation and
was intentionally left unchanged here. Therefore there is no closeout migration
to reproduce in full.

## 7. Decisions resolved during the pass

### Exactly one usable default is a service invariant

The original schema allowed `isDefault` to be cleared independently. That is no
longer treated as a harmless metadata edit because issue creation now relies on
configured defaults. The service owns the invariant: there must be a usable
active default for both work-item types and workflow states.

The first record is promoted automatically. This makes an empty/custom tenant
safe without forcing every UI/API caller to know when it is creating the first
record.

### Default promotion must be atomic

Clearing the previous default and then creating/updating the replacement as two
independent writes could leave no default when the second write fails. The
bounded default repository performs both changes in one Prisma transaction.

### Author ownership is a server rule for the implemented comment UX

The original comment brief described authors editing/deleting their own
comments. The remediation therefore chose author-bound semantics rather than a
coarse "any user with comments.edit may edit every comment" interpretation.
The host session supplies the actor; the owning API compares it with
`authorUserId`.

## 8. Deliberate gaps / future work

These are intentionally not part of the completed remediation scope:

1. **Issue edit UI** for type/state/milestone/custom fields. Update contracts
   already exist; the original C3 brief explicitly excluded issue edit.
2. **Dedicated settings edit UI** for existing types, states, milestones, and
   custom fields. PATCH routes already exist; creation/archive is the current
   human-facing settings scope.
3. **Editing/reordering existing select options** alongside future custom-field
   settings editing.
4. **Richer milestone forms** for description, dates, and status.
5. **Project-default configuration UI/API surface.** Issue creation honors an
   already-persisted `Project.defaultWorkItemTypeId`, but this redesign does not
   expose a user-facing project setting for changing it.
6. **Milestone read batching/lazy loading.** Current server data loads milestone
   lists per project. It is correct but can become an N-request fan-out for
   organizations with many projects. A project-scoped lazy host GET or bounded
   batch endpoint is the preferred future optimization rather than widening the
   public API during correctness closeout.
7. **Cycle management UI/API.** Cycles deliberately remain schema/repository
   support in this phase.
8. **Pre-existing Projects user-settings jsdom failures.** Earlier execution
   recorded 16 unrelated navigation-mock failures. They are not repaired by
   this redesign and should be fixed before the entire Projects-app suite is made
   an unconditional merge gate.

## 9. Things GPT Web could not verify

GPT Web did not and cannot verify any of the following in this environment:

- TypeScript compilation of the changed files/packages.
- ESLint on the changed Projects API/app code.
- Vitest execution or the runtime outcome of the 10 new cases.
- Prisma client compatibility with the transaction-client types.
- Database behavior of the atomic default transactions.
- Next.js rendering/hydration behavior of the Projects shell after the helper
  rename.
- Full-suite interaction with the pre-existing jsdom navigation failures.
- Migration application or production data because no migration was run here.

A truthful `not executed` is intentional. Historical green results in the plan,
C3 report, or testing note belong to earlier commits and are not evidence for
this closeout head.

## 10. Risk notes

### Highest risk: unexecuted backend transaction/type changes

The default transition code is small and follows the repository boundary, but it
uses Prisma transaction-client types and therefore needs the Projects API
TypeScript/tests to run before merge.

### Existing tenants with malformed historical defaults

The service prevents creating new no-default states and prevents normal API
updates/deletes from removing the current default. If production data already
contains multiple defaults or no default because of out-of-band writes, the
first subsequent service mutation will not retroactively normalize every such
case unless it goes through a default promotion/create path. A one-off data audit
can be run during deployment if historical DB state is uncertain.

### Milestone fan-out is bounded by project count, not a correctness issue

New-issue/settings server data currently performs per-project milestone reads.
This should be measured before adding a new read contract. Do not turn the
performance follow-up into a second public API path without evidence it is
needed.

## 11. Required verification commands

Run these commands on the **current branch head after this report commit**:

```bash
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test

pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test

pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test

pnpm --filter @876/projects-mcp typecheck
pnpm --filter @876/projects-mcp test

node scripts/check-app-structure.mjs
```

Also perform the GPT-Web review guard requested by `.claude/rules/cli.md` over
the touched implementation paths:

```bash
grep -rn "eslint-disable\|as any" \
  apps/projects-api/src/modules/work-structure \
  apps/projects-api/src/http/errors.ts \
  apps/projects/src/components/shell
```

No claim that these commands pass is made in this report.

## 12. Merge-readiness statement

**Implementation scope: complete. Verification scope: pending execution.**

The known correctness defects identified in the post-C3 review are implemented
on the branch, including the previously unfinished default-transition invariant.
The branch should move to merge review only after the commands in §11 have been
run against the current head and any failures attributable to this branch have
been resolved.
