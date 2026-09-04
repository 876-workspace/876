# Remaining work after Projects redesign

## Feature scope

The planned Projects redesign is implemented. The configurable work-structure
flow is available through settings and new-issue creation, and issue edit is
intentionally outside this phase.

## Follow-up candidates

1. Add dedicated edit interactions for existing work item types, workflow
   states, milestones, and custom fields. The typed PATCH host routes already
   exist; the current settings UI intentionally covers creation and archive.
2. Add richer milestone fields (description, dates, and status) and the
   remaining work-structure presentation fields to the settings forms when
   product requirements call for them.
3. Add custom-field option editing for existing select and multi-select fields
   alongside the future edit interactions.
4. Repair the unrelated Projects app jsdom navigation failures before requiring
   the entire app Vitest suite as a merge gate. The observed failures are 10
   assertions in `settings/users/_components/users-list.test.tsx` and 6 in
   `settings/users/[membershipId]/_components/member-card.test.tsx`.

## Verification status

Focused work-structure tests pass (34 assertions across six files), as does
`pnpm --filter @876/projects-app typecheck`. The full Projects app test suite
remains blocked only by the user-settings navigation failures above.
