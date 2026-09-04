# Remaining work after Projects redesign remediation

## Feature scope

The planned Projects redesign and the correctness remediation are implemented on
`feat/projects-comments-and-mobile-redesign`. The configurable work-structure
flow is available through settings and new-issue creation; comments are writable
from Projects with author-bound edit/delete enforcement; mobile navigation and
responsive list presentation are in place. Issue edit remains intentionally
outside this phase.

The follow-up remediation closed the merge-blocking defects found during the
post-implementation review:

- new-issue custom-field scoping now compares work-item-type IDs rather than
  comparing an ID list to a type key;
- custom-field creation has a real `text` default, select/multi-select option
  authoring, required-field configuration, and work-item-type bindings;
- issue creation resolves configured workflow/type defaults instead of literal
  `todo`/`task`, including an already-persisted project default work-item type;
- required and type-applicability custom-field rules are enforced by the owning
  Projects API, not only by the browser form;
- issue and custom-field writes share one Prisma transaction;
- default work-item type/workflow state transitions are atomic, the first active
  record becomes the default, and an active default cannot be unset or archived;
- empty work-item-type PATCH bodies are rejected instead of receiving the create
  schema's `hierarchyLevel` default;
- comment edit/delete ownership is enforced in the Projects API using the
  authenticated actor supplied by the host route; delete errors are surfaced and
  server-refreshed comment props are reconciled;
- the duplicate mobile search control is removed; and
- the copied `isActiveCrmPath` helper name is replaced with
  `isActiveProjectsPath`.

## Valid follow-up candidates

1. Add dedicated edit interactions for existing work item types, workflow
   states, milestones, and custom fields. Typed PATCH host routes already exist;
   the current settings UI intentionally covers creation and archive.
2. Add richer milestone creation/edit fields (description, dates, status) when
   product requirements call for them.
3. Add option editing/reordering for existing select and multi-select custom
   fields alongside the future settings edit interactions.
4. Add issue-edit UI for type, state, milestone, and custom-field values. The
   owning API already supports the required update contracts.
5. Add a user-facing control for `Project.defaultWorkItemTypeId` if per-project
   type defaults become part of the settings product. Issue creation now honors
   a persisted project default, but this redesign does not expose a project
   setting for changing it.
6. Replace the current per-project milestone fan-out used by server-rendered
   new-issue/settings data with a lazy project-scoped read or a bounded batch
   endpoint if organizations begin carrying enough projects for the fan-out to
   matter. This is a performance optimization, not a correctness dependency.
7. Add cycle management UI/API when cycles become a human-facing feature; the
   current phase intentionally stops at schema/repository support.
8. Repair the unrelated Projects app jsdom navigation failures before requiring
   the entire app Vitest suite as a merge gate. The previously observed failures
   were 10 assertions in `settings/users/_components/users-list.test.tsx` and 6
   in `settings/users/[membershipId]/_components/member-card.test.tsx`.

## Verification status

The earlier C3 implementation report recorded focused work-structure checks and
Projects-app typecheck results before this remediation. Those historical results
do **not** verify the new remediation commits.

GPT Web cannot execute repository commands. The current remediation has therefore
**not been executed or typechecked by this pass**. Run the following from the
branch before merge:

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

Do not treat this report as a green merge gate until those commands have run on
the current branch head.
