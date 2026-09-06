# Billing membership-management parity

Implemented on the existing `feature/finance-apps` worktree; no branch was
created and no commit was made.

## Baseline

The verified trees matched the brief before implementation. Invoice contained
the complete `settings/users` split-view/detail tree and both
`api/app-memberships` routes. Billing contained only `settings/users/layout.tsx`,
`settings/users/page.tsx`, and `settings/users/invite/page.tsx`, with no
app-membership API route or `@876/access-ui` dependency.

## Changes

- Added `@876/access-ui` and `@876/workspace` to Billing dependencies. The
  workspace dependency is required for Billing's session-tier bounded client.
  The workspace lockfile was refreshed for those two workspace links.
- Ported the Invoice users split-view shell/list, member record, app-access
  tab, permissions tab, data loaders, and typed browser mutation client into
  Billing. The existing invite route and roles surface were left unchanged.
- Added Billing `api/app-memberships` create, update, and delete transport
  routes. They authenticate with `getWorkspaceContext`, authorize through the
  Billing-local app-access guard, validate with Zod, call one bounded-client
  app-membership verb, and preserve the canonical `{ data, error }` envelope.
- Added Billing's `apps:assign` guard in `src/lib/auth/app-access.ts` because
  Billing did not already have an app-access-manager guard. It resolves the
  acting organization member through `workspace.members.retrieveMe` and fails
  closed on unavailable or missing permission.
- Moved Invoice's shared `_lib/types.ts` and `_lib/member-utils.ts` behavior to
  `@876/access-ui/member-types` and `@876/access-ui/member-utils`, then updated
  Invoice imports. This avoids a second cross-app copy.
- `apps/billing/next.config.ts` was not changed: `@876/access-ui` is already
  included by `scripts/shared-ui-packages.mjs` through the shared transpile
  list.

## Tests

There are 22 literal `it()` cases in the new parity coverage:

- 10 route-handler cases, including authentication, authorization, invalid
  input, exact create/update/delete arguments, service-error envelopes, and
  negative-space workspace-call assertions;
- 4 Billing member-list rendering cases;
- 4 Billing member-record rendering cases;
- 4 tests for the moved shared member utilities.

The Billing test command completed successfully with 765 tests, including the
new cases. `@876/access-ui` typecheck and all 83 package tests also passed.

## Verification

Commands run:

```text
pnpm --filter @876/access-ui typecheck
pnpm --filter @876/access-ui test
pnpm --filter @876/billing-app test -- src/app/api/app-memberships/route.test.ts src/app/(app)/settings/users/_components/users-list.test.tsx src/app/(app)/settings/users/[membershipId]/_components/member-card.test.tsx
git diff --check
pnpm check:transpile
node scripts/check-app-structure.mjs
```

The requested Billing typecheck could not complete because the existing
concurrent worktree contains an unrelated syntax error in
`packages/billing-ui/src/panels/panel.ts` (a `.ts` file containing JSX). That
file is outside this task's allowed scope and was not changed. The full
orchestrator verification commands were not run after that known blocker.

`node scripts/check-app-structure.mjs` passed. `pnpm check:transpile` reached
the shared transpile check successfully but then reported the pre-existing
Billing Tailwind-source requirement for `@876/access-ui` in
`apps/billing/src/app/globals.css`. That file is outside the task's allowed
scope, so it was not changed; `next.config.ts` itself needs no change because
the package is already in `scripts/shared-ui-packages.mjs`.

The worktree also contains unrelated concurrent Phase 1 changes under the
Billing and Invoice customer surfaces; they were preserved.
