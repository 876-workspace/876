# Gemini brief: finish and harden Work Widget Phase 4

## Objective

Finish the existing Phase 4 implementation on `feat/work-widget-phase-4`. Treat the current branch as work in progress: preserve its intended Invoice + Work Widget functionality, correct the review findings below, add missing behavioral coverage, and leave the worktree ready for a separate Codex review.

Do not commit, push, open/update a PR, rebase, amend existing commits, or change branches. Leave all fixes uncommitted. Do not apply, drop, or edit any git stash.

## Required reading before editing

Read these files completely and follow them:

1. `AGENTS.md`
2. `.agents/rules/ai-code-quality.md`
3. `.agents/rules/performance.md`
4. `.agents/rules/types.md`
5. `.agents/rules/code-style.md`
6. `.agents/rules/data-fetching.md`
7. `.agents/rules/api-access.md`
8. `.agents/rules/access-tiers.md`
9. `.agents/rules/app-api-routing.md`
10. `.agents/rules/api-backend.md`
11. `.agents/rules/stripe-api-pattern.md`
12. `.agents/rules/feature-flags.md`
13. `.claude/rules/git.md`
14. `.claude/rules/implementation-tracker.md`
15. `plans/2026-09-09-work-calendar-widget-phase-4/plan.md`
16. `plans/2026-09-09-work-calendar-widget-phase-4/tracker.md`
17. Existing Phase 4 briefs and reports under that plan directory.

For any Next.js routing/rendering/config changes, also read the matching local Next.js guide under `node_modules/next/dist/docs/` before editing.

## Current known verification state

Do not assume the branch is green. The last review observed:

- `@876/work`: typecheck and 235 tests pass.
- `@876/work-api`: typecheck/build pass; lint has no errors and two warnings; the full test suite has one failure.
- `@876/widgets`: typecheck, 149 unit tests, and six browser tests pass, but the new Phase 4 behavior lacks dedicated tests.
- `@876/invoice-app`: 464 tests pass; typecheck fails.
- `@876/api`: typecheck and 2,267 tests pass.
- Root `check:transpile`, `check:service-bundle`, and `git diff --check` pass.

## Required fixes

### 1. Repair the Invoice type error without casts or duplicate domain types

`@876/invoice-app` currently fails typecheck in:

- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx`
- `apps/invoice/src/lib/auth/work-widget-context.ts`

The root `Invoice` contract from `@876/billing` guarantees `id` but exposes additional fields through `Record<string, unknown>`; it does not statically guarantee `number`. Make context-label derivation accept the canonical client result and narrow `invoice.number` at runtime. Fall back to the invoice ID when the value is absent, non-string, or blank.

Do not use `as any`, double assertions, unsafe assertions, or introduce a parallel Invoice type. Add focused tests for a valid number and all fallback cases.

### 2. Correct authorization for the aggregate resource-work endpoint

The current endpoint can return tasks, reminders, and events for users other than the caller, but it is authorized with only `my-work.view`:

- `apps/work-api/src/modules/resource-work/resource-work.routes.ts`
- `apps/invoice/src/app/api/resource-work/route.ts`

This is an authorization widening bug. Custom roles may hold `my-work.view` without `tasks.view`, `reminders.view`, and `events.view`. The existing Work session guard treats its permission array as **any-of**, so merely adding three permissions to that array is not a fix.

Implement explicit all-required authorization semantics at the canonical Work API boundary, reusing/extending the existing security model rather than adding a route-local ad hoc guard. Preserve the integration-client path using `work.resource-work.read`. Apply the matching all-required permission check in the Invoice BFF alongside its existing invoice access and feature checks.

Add assembled route/auth tests—not just service-unit mocks—that prove:

- `my-work.view` alone is rejected;
- any one or two of the resource view permissions are insufficient;
- all required resource view permissions are accepted;
- the integration scope is accepted;
- exact Invoice host-resource access is required;
- access to another organization is rejected.

Keep route-local guard ordering correct so nonexistent routes remain 404s rather than auth failures.

### 3. Preserve contextual task link metadata atomically

The helper `toCreateWorkTaskLinkInput` preserves context label and URL, but the production contextual-task flow does not use it. Current task creation writes only legacy context fields, and the primary task link loses `label`/`url`.

Trace the entire flow through:

- `packages/work/src/resource-ref.ts`
- `apps/invoice/src/app/api/tasks/route.ts`
- `apps/work-api/src/modules/tasks/tasks.service.ts`
- `apps/work-api/src/modules/tasks/tasks.repository.ts`
- the existing task-links service/repository and public module exports.

Fix this at the canonical Work owner. Reuse the existing input/helper and task-link ownership instead of duplicating mapping logic. The task and its canonical primary link must not be left partially created if link persistence fails; use the repository/service transaction pattern already established in this codebase. Preserve the legacy `context` projection for compatibility.

Add tests proving:

- contextual task creation returns/persists its canonical link with label and URL;
- the legacy context projection remains correct;
- ordinary non-contextual task creation is unchanged;
- a link-write failure cannot leave a partially created contextual task.

### 4. Add the missing Phase 4 behavioral coverage

Add meaningful tests for the shipped behavior. At minimum cover:

#### Shared widget context and UI

- provider publishes the exact context;
- setter cleanup clears only the context instance it installed;
- navigation/context transition A → B cannot let A's cleanup erase B;
- the scope control is absent without context;
- the user can switch between My Work and the current resource;
- a late response for context A cannot render after switching to B;
- a contextual create remains visible in the contextual scope.

#### Invoice BFF route handlers

- aggregate resource-work route;
- contextual task, event, and reminder creation routes;
- feature, permission, session, organization, and invoice-resource boundaries;
- upstream success/error envelope behavior.

#### Work API

- the assembled `GET /v1/organizations/:organizationId/resource-work` route, validation, auth modes, and response envelope;
- update the provisioning test expectation to include the deliberate `work.resource-work.read` scope.

Avoid tests that only restate mocked configuration. Assert externally observable behavior and race/error cases.

### 5. Bound and simplify aggregate collection

The Work API currently validates only `to > from`, allowing an integration caller to request an arbitrarily large interval even though the Invoice BFF caps its window. Enforce the canonical maximum range at the Work API boundary as well, preferably from one shared constant/schema source.

Review `resource-work.service.ts` for these specific problems:

- tasks, reminders, and events are collected sequentially even though they are independent;
- pagination silently truncates at 100 pages/10,000 items;
- the return type combines an aggregate result with an unrelated task-list return type;
- `as never` assertions hide type incompatibilities.

Make the smallest maintainable correction. Independent work may run concurrently. A configured safety limit must produce explicit, testable behavior rather than silent data loss. Replace the loose return union and assertions with the correct shared result/error types. Do not introduce unbounded database reads or a new abstraction when an existing owner can be extended.

### 6. Recheck the host route shape

Compare the new Invoice browser endpoints against `.agents/rules/app-api-routing.md`. The final browser URL should use Invoice-owned resource vocabulary and must not expose internal service routing or accept a caller-controlled generic resource tuple when the host already knows the invoice ID. If the present `/api/resource-work?contextService=...` shape violates that rule, migrate it cleanly (for example, to an invoice-nested Work endpoint) and update the shared browser adapter without embedding Invoice-specific knowledge in the shared Work package.

Keep this narrowly scoped; do not redesign unrelated routes.

## Quality constraints

- Search for the existing owner before adding helpers, types, schemas, constants, or dependencies.
- Do not create a third implementation of behavior already shared twice.
- No swallowed errors, placeholder branches, compatibility shims without a current caller, broad casts, `@ts-ignore`, or new lint suppressions.
- Maintain `{ data, error }` envelopes, Stripe-style object discriminators, Unix-second timestamps, and existing list contracts.
- Keep all provider/database/business logic in its owning service. Invoice must use the typed Work package/BFF boundary.
- Never expose internal keys or add `NEXT_PUBLIC_*` credentials.
- Do not modify Phase 3, PR #522, unrelated products, widget IDs/slugs, provider sync, deletion behavior, or expand rollout to Chat/CRM/Couriers/customer surfaces.
- Avoid a schema migration unless the canonical existing model truly cannot represent the required metadata; document the evidence if one becomes necessary.

## Tracker and report

After the code and verification are genuinely complete:

1. Update `plans/2026-09-09-work-calendar-widget-phase-4/tracker.md` to reflect the actual state. It currently incorrectly says implementation has not started.
2. Check off only items directly supported by the final diff and observed command output.
3. Write a concise completion report at:
   `plans/2026-09-09-work-calendar-widget-phase-4/reports/agy/2026-09-09-gemini-phase-4-remediation.md`
4. Include changed areas, important design decisions, tests added, exact command outcomes, and any residual concern for the reviewer.

Do not claim a command passed unless you ran it and observed success.

## Required verification

Run the relevant focused tests while iterating, then run all of these before stopping:

```bash
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api test
pnpm --filter @876/work-api build
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/widgets test:browser
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm check:transpile
pnpm check:service-bundle
git diff --check
```

Run Prettier checks over every changed file. Review the finished diff for duplication, compatibility residue, swallowed errors, authorization gaps, unsafe assertions, and accidental unrelated changes. Also scan changed production files for suppressions/casts and newly introduced credentials or direct Work service URLs.

## Stop condition

Stop only when the fixes, tests, tracker, report, and verification are complete. Leave the resulting worktree uncommitted for Codex to review. In your final response, summarize the result and explicitly say that you did not commit or push.
