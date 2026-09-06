# Brief: Correct the PostHog experiments base setup

You are fixing an existing, uncommitted implementation already present in the working
tree on branch `feature/posthog-experiments-base-setup`. Do **not** start over — the
direction is right. Fix the defects listed below.

Do not commit. Do not create branches or PRs. The orchestrator commits.

## Rules to read first

`.agents/rules/ai-code-quality.md`, `.agents/rules/naming.md`,
`.agents/rules/feature-flags.md`, `.agents/rules/error-handling.md`,
`.agents/rules/testing.md`, `.agents/rules/express-api.md`,
`.agents/rules/sdk-conventions.md`.

## Verified premises (I checked these — build on them, do not re-derive)

`posthog-node` is pinned at **5.49.1** (`apps/api/package.json`). In that version:

- `getFeatureFlag`, `getFeatureFlagPayload`, and `isFeatureEnabled` are **deprecated**.
  The SDK emits a runtime deprecation warning naming the replacement.
- The `sendFeatureFlagEvents` option on `getFeatureFlag` is marked
  `@deprecated THIS OPTION HAS NO EFFECT` in `client.d.ts`.
- The replacement is `posthog.evaluateFlags(distinctId, options)`, returning a
  `FeatureFlagEvaluations` snapshot with `.isEnabled(key)`, `.getFlag(key)`,
  `.getFlagPayload(key)`. It consolidates evaluation into **one** `/flags` request.
- `AllFlagsOptions` accepts `flagKeys?: string[]` to scope the request, plus
  `groups`, `personProperties`, `groupProperties`.
- `.getFlag(key)` fires the `$feature_flag_called` exposure event on first access per
  `(distinctId, flag, value)` tuple, deduped by the SDK. `.getFlagPayload(key)` fires
  nothing and does not count as an access.
- `.getFlag(key)` returns the variant `string` for multivariate flags, `true` for a
  plain enabled flag, `false` for disabled, and `undefined` when the flag was not
  returned by the evaluation.

Types are at
`node_modules/.pnpm/posthog-node@5.49.1/node_modules/posthog-node/dist/{client,types,feature-flag-evaluations}.d.ts`.
Read them before writing code.

## Task 1 — Rewrite the evaluator on `evaluateFlags` (`apps/api/src/providers/posthog/flags.ts`)

The current code loops `getFeatureFlag` per slug (N requests) and the uncommitted
change adds a second `getFeatureFlagPayload` per enabled slug (2N requests), both on
deprecated APIs, all inside a 3s timeout budget.

Replace the body of `evaluateWithTimeout` with a **single** `evaluateFlags` call:

```ts
const flags = await posthog.evaluateFlags(params.distinctId, {
  flagKeys: params.slugs,
  ...(params.groups ? { groups: params.groups } : {}),
  ...(params.personProperties ? { personProperties: params.personProperties } : {}),
  ...(params.groupProperties ? { groupProperties: params.groupProperties } : {}),
})

const decisions = new Map<string, FeatureEvaluationResult>()
for (const slug of params.slugs) {
  const value = flags.getFlag(slug)
  if (value === undefined) continue
  decisions.set(slug, {
    enabled: value !== false,
    variant: typeof value === 'string' ? value : null,
    payload: flags.getFlagPayload(slug) ?? null,
  })
}
return decisions
```

Requirements:

- Keep the existing `Promise.race` timeout wrapper and its `clearTimeout` in `finally`
  exactly as it is today. Only the raced work changes.
- Delete the `sendFeatureFlagEvents: true` line from `evaluationOptions` — it has no
  effect in 5.x. Keep the rest of `evaluationOptions` and use it to build the
  `evaluateFlags` options, or inline it; either is fine, but there must be one
  definition of how those three optional fields are assembled.
- Delete the `includePayloads` parameter from the `FeatureFlagEvaluator['evaluate']`
  signature entirely. With `evaluateFlags` the payload is already in the snapshot and
  costs no extra request, so the flag has nothing to switch off.
- Delete the `typeof posthog.getFeatureFlagPayload === 'function'` guard and the
  surrounding try/catch. The SDK method exists; a guard for an impossible state is
  forbidden by `ai-code-quality.md`.
- `payload` on `FeatureEvaluationResult` becomes `payload: unknown` (not optional) with
  `null` for absent, so downstream code has one shape to handle.

## Task 2 — Remove the compat union (`apps/api/src/services/features.ts`)

`evaluateDetailed` currently declares
`Map<string, FeatureEvaluationResult | boolean>` and then narrows with
`typeof posthogDecision === 'object'` checks and a `as boolean | undefined` cast, in
two places. The evaluator only ever returns `FeatureEvaluationResult`, so the union is
residue for a state that cannot occur.

- Type it `Map<string, FeatureEvaluationResult>`.
- Delete both `typeof … === 'object'` narrowings and the `as boolean | undefined` cast.
- `rolloutDecisions.set(feature.id, posthogDecision?.enabled ?? feature.enabled)`.
- The final decision keeps the existing kill-switch behaviour: when the resolved
  `enabled` is false, `variant` and `payload` are `null`. Preserve that.

## Task 3 — Drop the dual property name (`apps/api/src/modules/features/features.schemas.ts`)

`evaluateFeaturesQuerySchema` gained **both** `visitorId` and `visitor_id`. Every other
key in that schema is camelCase (`userId`, `organizationId`, `appSlug`). Delete
`visitor_id` from the schema and delete the `?? query.visitor_id` fallbacks in
`features.service.ts`. Keep `visitorId`.

## Task 4 — One `getExperiment` resolver, not three copies

The same ~30-line decision-resolution block is currently duplicated verbatim in:

- `packages/core/src/platform/resources/features.ts`
- `packages/platform/src/resources/features.ts`
- `apps/876/src/lib/auth/auth-routing-client.ts`

and the result type is declared four times (`PlatformExperimentDecision`,
`AdminExperimentDecision`, `ConsumerExperimentDecision`, plus the ADR).
`ai-code-quality.md` forbids the third copy.

Do this:

- In `packages/core/src/platform/experiments.ts`, export one generic result type
  `ExperimentDecision<T = unknown> = { key, enabled, variant, payload, isControl }`
  and one pure resolver:

  ```ts
  export function resolveExperimentDecision<T>(
    featureSlug: string,
    decisions: readonly { feature: { slug: string }; enabled: boolean;
                          variant?: string | null; payload?: unknown }[] | null
  ): ExperimentDecision<T>
  ```

  It must keep today's semantics: no match or `null` decisions → disabled control;
  `variant`/`payload` are `null` unless `enabled`; `isControl` is
  `!variant || variant === 'control'`.

- All three call sites import and call that resolver. Each keeps only its own transport
  call plus the resolver invocation.
- `PlatformExperimentDecision` and `AdminExperimentDecision` become aliases of
  `ExperimentDecision` (re-exported for their package's vocabulary), not independent
  structural copies. Delete `ConsumerExperimentDecision` and use `ExperimentDecision`
  in `apps/876`.
- `packages/platform` and `apps/876` already depend on `@876/core`; verify before
  importing and report if either does not.
- The resolver's JSDoc must state explicitly that a failed evaluation resolves to
  disabled control **by contract** (the resilience invariant), so it is not read as a
  swallowed error.

Also delete the `query: params as Record<string, string | number | boolean | undefined>`
cast in `packages/platform/src/resources/features.ts` — build the query object
explicitly, field by field, like the sibling methods in that file do.

## Task 5 — Delete the dead visitor-cookie constant

`EXPERIMENT_VISITOR_COOKIE = '_876_vid'` in `packages/core/src/platform/experiments.ts`
is exported and read by nothing — I grepped the whole repo. The cookie bridge it was
meant for was never implemented, and it cannot be implemented the way the plan
described: `.agents/rules/new-app-guide.md` §3c forbids `proxy.ts`/`middleware.ts` in
every app, and an RSC cannot set a cookie.

Delete the constant. Keep all the `visitorId` plumbing (schema, service, clients, app
helpers) — that is the useful half and it works with any caller-supplied id.

Then remove the anonymous-visitor **cookie** claims from
`.claude/rules/feature-flags.md`, `.agents/rules/feature-flags.md`, and
`docs/architecture/024-posthog-experiments.md`, replacing them with: experiments may be
evaluated for an anonymous visitor by passing `visitorId`; establishing a durable
visitor id is a per-app concern and is not yet implemented. Record it as an explicit
follow-up in the ADR.

## Task 6 — Memoize the per-app experiment helpers

`getExperiment` issues a full `/features/evaluate/details` round trip **per call**, so a
page checking two experiments pays two full evaluations on top of its existing feature
fetch. `.agents/rules/navigation-performance.md` Rule 3 requires these reads to be cheap.

In each app helper that has a `getPlatformClient()`-backed experiment function
(`apps/crm`, `apps/enterprise`, `apps/billing`, `apps/couriers`, `apps/invoice`,
`apps/projects`, `apps/console`, `apps/876`), memoize the underlying details fetch with
`React.cache`.

Critical: `React.cache` compares arguments with `Object.is`, so the cached function must
take **primitives**, never an options object — an inline object literal is a guaranteed
cache miss on every call. Shape it as:

```ts
const getExperimentDecisions = cache(async function getExperimentDecisions(
  userId: string | undefined,
  organizationId: string | undefined,
  visitorId: string | undefined
) { /* one evaluateDetails call */ })
```

then resolve the slug from that result with `resolveExperimentDecision`.
`apps/crm/src/lib/features.ts` already uses this `cache(...)` pattern for
`getCachedFeatures` — match it.

## Task 7 — Correct the rules and the ADR

`.claude/rules/feature-flags.md`, `.agents/rules/feature-flags.md`, and
`docs/architecture/024-posthog-experiments.md` currently assert the deprecated design.
They must be corrected, and the two rule files must stay **byte-identical**:

- Exposure events: `$feature_flag_called` is emitted by `FeatureFlagEvaluations.getFlag()`
  on first access per `(distinctId, flag, value)`, deduped by the SDK. Delete every
  mention of `sendFeatureFlagEvents: true` — it has no effect in posthog-node 5.x.
- Evaluation: one `evaluateFlags()` call per evaluation, scoped with `flagKeys`.
  State that `getFeatureFlag`/`getFeatureFlagPayload` are deprecated and must not be
  reintroduced.
- Client access: `resolveExperimentDecision` is the single resolver; the per-package
  `getExperiment` methods are thin transport wrappers over it.
- Keep the local-governance precedence section as written — it is correct.

## Tests

Every task above needs coverage. Minimum **14** new or rewritten `it()` cases, counted
literally, across `apps/api/src/providers/posthog/__tests__/flags.test.ts`,
`apps/api/src/services/__tests__/features.test.ts`, and a new
`packages/core/src/platform/__tests__/experiments.test.ts` (match the neighbouring test
file layout in that package before choosing the path).

The existing tests in those two api files mock the old two-call shape and will need
rewriting for the `evaluateFlags` snapshot. Cover at least:

- one `evaluateFlags` call is made per evaluation, with `flagKeys` equal to the slug
  list — assert with `toHaveBeenCalledTimes(1)` and `toHaveBeenCalledWith(...)`;
- a multivariate string value yields `{ enabled: true, variant: 'treatment' }`;
- a boolean `true` yields `{ enabled: true, variant: null }`;
- `false` yields `{ enabled: false, variant: null }`;
- `undefined` (flag absent from the snapshot) produces **no** map entry;
- a payload is carried through, and an absent payload is `null`;
- a local kill switch forces `enabled: false`, `variant: null`, `payload: null` even
  when PostHog returned a variant;
- `visitorId` is used as the `distinctId` when `userId` is null, and `userId` wins when
  both are present;
- evaluation with neither `userId` nor `visitorId` does not call PostHog at all
  (`not.toHaveBeenCalled()`);
- a PostHog rejection and a timeout each fall back to local state without throwing;
- `resolveExperimentDecision` on a null decision list, on a missing slug, on an enabled
  variant, and on a disabled feature that still carries a stale variant.

Assert complete result objects, not `toBeDefined()`. Exact call counts as numbers.

## Verification — run all of these, in the foreground, and paste real output

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/core typecheck
pnpm --filter @876/platform typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/crm typecheck
node scripts/check-app-structure.mjs
```

The api suite is currently **114 files / 2256 tests, all passing** — that is your
baseline. The test count must go up, not just stay green.

Do not add `eslint-disable`, `@ts-ignore`, or `as any` to make anything pass.

## Report

Write `plans/2026-09-06-posthog-experiments-base-setup/reports/codex/2026-09-06-experiments-corrections.md`:
per-task status, the counted number of `it()` cases added, every file changed with the
reason, verification output, anything you could not verify, and any premise above that
turned out to be wrong.
