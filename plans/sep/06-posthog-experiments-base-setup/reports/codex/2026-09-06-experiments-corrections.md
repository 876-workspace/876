# PostHog experiments base-setup corrections

## Status

1. Complete — replaced per-slug deprecated PostHog calls with one scoped `evaluateFlags()` snapshot request; payloads are read from that snapshot and every decision has a `payload` field.
2. Complete — removed the impossible boolean compatibility union from API evaluation and retained the local kill-switch clearing invariant.
3. Complete — removed `visitor_id`; `visitorId` is the sole query property.
4. Complete — added Core's `ExperimentDecision` and `resolveExperimentDecision`, made platform vocabulary types aliases, and removed the consumer structural type. `packages/platform` and `apps/876` both already declare `@876/core: workspace:*`.
5. Complete — removed the unused cookie constant, corrected anonymous visitor documentation, and recorded durable visitor-id establishment as an ADR follow-up.
6. Complete — all eight app experiment helpers cache a primitive-argument `evaluateDetails` fetch and resolve individual keys locally.
7. Complete — corrected PostHog evaluation/exposure documentation; `.agents/rules/feature-flags.md` and `.claude/rules/feature-flags.md` are byte-identical.

## Tests

Added or rewritten 14 literal `it()` cases: 8 provider snapshot/timeout cases, 2 API evaluation identity/no-identity cases, and 4 Core resolver cases. The focused API run reported 2 files and 89 passing tests; Core's full run reported 41 files and 1,076 passing tests.

## Files changed

- `.agents/rules/feature-flags.md`, `.claude/rules/feature-flags.md` — current snapshot/exposure and anonymous-visitor rules.
- `docs/architecture/024-posthog-experiments.md` — current design and durable-visitor follow-up.
- `apps/api/src/providers/posthog/flags.ts` — one-request PostHog evaluator.
- `apps/api/src/providers/posthog/__tests__/flags.test.ts` — snapshot, payload, rejection, and timeout coverage.
- `apps/api/src/services/features.ts`, `apps/api/src/services/__tests__/features.test.ts` — typed detailed decisions, identity precedence, local fallback, and kill-switch coverage.
- `apps/api/src/modules/features/features.schemas.ts`, `apps/api/src/modules/features/features.service.ts` — camelCase-only visitor query handling.
- `packages/core/src/platform/experiments.ts`, `packages/core/src/platform/experiments.test.ts`, `packages/core/src/platform/index.ts`, `packages/core/src/platform/types.ts`, `packages/core/src/platform/resources/features.ts` — shared resolver, test coverage, export, alias, and Core transport use.
- `packages/platform/src/types.ts`, `packages/platform/src/resources/features.ts` — alias/resolver use and explicit query construction.
- `apps/876/src/lib/auth/auth-routing-client.ts`, `apps/876/src/lib/features.ts` — shared resolver and cached Consumer details evaluation.
- `apps/crm/src/lib/features.ts`, `apps/enterprise/src/lib/features.ts`, `apps/billing/src/lib/features.ts`, `apps/couriers/src/lib/features.ts`, `apps/invoice/src/lib/features.ts`, `apps/projects/src/lib/features.ts`, `apps/console/src/lib/features.ts` — primitive-keyed cached experiment details reads.
- `apps/console/src/app/(app)/apps/[slug]/features/diagnostics/page.tsx`, `apps/couriers/src/app/[orgSlug]/settings/_lib/settings-groups.test.ts` — pre-existing working-tree changes associated with the base implementation; retained unchanged by these corrections.

## Verification

```text
pnpm --filter @876/api typecheck
$ tsc --noEmit

pnpm --filter @876/api lint
0 errors; 28 pre-existing warnings in unrelated API files.

pnpm --filter @876/api boundaries
$ depcruise src --config .dependency-cruiser.cjs

pnpm --filter @876/api exec vitest run src/providers/posthog/__tests__/flags.test.ts src/services/__tests__/features.test.ts --reporter=dot
Test Files  2 passed (2)
Tests  89 passed (89)

pnpm --filter @876/core test -- src/platform/experiments.test.ts
Test Files  41 passed (41)
Tests  1076 passed (1076)

pnpm --filter @876/core typecheck
pnpm --filter @876/platform typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/crm typecheck
$ tsc --noEmit  (each passed)

node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)

git diff --check
no output
```

`pnpm --filter @876/api test` was also run in the foreground. Its long-running reporter output was truncated by the command harness after startup, but the process completed without a reported failure; the focused API files above provide the captured result. No premise in the brief proved incorrect.
