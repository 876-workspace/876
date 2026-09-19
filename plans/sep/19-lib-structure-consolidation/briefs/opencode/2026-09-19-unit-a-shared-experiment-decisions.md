# Unit A — hoist the duplicated experiment resolver into `@876/core`

## Context you need (do not go looking for more)

Eight 876 apps each have a `src/lib/features.ts`. Inside each one sits the same
~30-line block, **byte-identical except for one function name and one app-slug
constant**. It was verified by diff. Your job is to hoist that block into
`@876/core` and have all eight call it.

Nothing else in `features.ts` changes. Do not touch flag resolution,
`getFeatures()`, `DEFAULT_UI_FEATURES`, `LEGACY_FEATURE_SLUGS`, or widgets.

## Read budget: 11 files, listed. Do not read anything else.

```
packages/core/src/platform/experiments.ts     (the destination neighbourhood)
packages/core/src/platform/index.ts           (the export surface)
apps/876/src/lib/features.ts
apps/billing/src/lib/features.ts
apps/console/src/lib/features.ts
apps/couriers/src/lib/features.ts
apps/crm/src/lib/features.ts
apps/enterprise/src/lib/features.ts
apps/invoice/src/lib/features.ts
apps/projects/src/lib/features.ts
```

## The duplicated block, verbatim (from `apps/enterprise/src/lib/features.ts`)

```ts
export async function getEnterpriseExperiment<T = unknown>(
  featureSlug: string,
  context?: {
    userId?: string
    organizationId?: string
    visitorId?: string
  }
) {
  return resolveExperimentDecision<T>(
    featureSlug,
    await getExperimentDecisions(
      context?.userId,
      context?.organizationId,
      context?.visitorId
    )
  )
}

const getExperimentDecisions = cache(async function getExperimentDecisions(
  userId: string | undefined,
  organizationId: string | undefined,
  visitorId: string | undefined
) {
  const platform = await getPlatformClient()
  const { data, error } = await platform.features.evaluateDetails({
    appSlug: ENTERPRISE_APP_SLUG,
    userId,
    organizationId,
    visitorId,
  })
  return error || !data ? null : data.data
})
```

In `apps/projects/src/lib/features.ts` the identical block differs **only** at:
- `getEnterpriseExperiment` → `getProjectsExperiment`
- `ENTERPRISE_APP_SLUG` → `PROJECTS_APP_SLUG`

The other six apps follow the same shape.

## What to build

### 1. `packages/core/src/platform/experiments.ts` — add a factory

Add (beside the existing `resolveExperimentDecision`, which you must not change):

```ts
export interface ExperimentContext {
  userId?: string
  organizationId?: string
  visitorId?: string
}

export interface AppExperimentResolverOptions {
  appSlug: string
  /** The host's already-configured platform client accessor. */
  getPlatformClient: () => Promise<PlatformExperimentClient>
}
```

`PlatformExperimentClient` is the minimal structural type the block actually
uses — it needs only `features.evaluateDetails(...)`. Derive it from what the
call site passes; do **not** import an app's client type into core.

Export a factory:

```ts
export function createAppExperimentResolver(options: AppExperimentResolverOptions)
```

returning `<T = unknown>(featureSlug: string, context?: ExperimentContext) => Promise<ExperimentDecision<T>>`,
implementing exactly the pasted behaviour.

**`React.cache` stays in the app, not in core.** `packages/core` must not import
`react`. So the factory takes the already-memoised decisions accessor, or the app
wraps the returned resolver — pick whichever keeps `react` out of core, and say
which you chose in your report. Per-request memoisation must be preserved: each
app still calls `cache()` exactly once for its decisions accessor.

`React.cache` compares arguments with `Object.is`. The existing code passes three
primitives, never an object literal. **Preserve that** — if you change the
signature to take a `context` object, memoisation silently stops working
(`.agents/rules/navigation-performance.md` Rule 3). This is the single thing most
likely to go wrong in this task.

Export the new symbols from `packages/core/src/platform/index.ts`.

### 2. Each of the eight apps

Replace the duplicated block with a call to the factory. **Keep the exported
wrapper name exactly as it is today** (`getEnterpriseExperiment`,
`getProjectsExperiment`, `getCrmExperiment`, …) so that no file outside
`features.ts` changes. Verify with a grep that no other file needed editing; say
so in your report.

### 3. Tests

Add to `packages/core/src/platform/experiments.test.ts` — minimum **8** new
`it()` cases, and count them in your report:
- resolves a decision for a given slug;
- passes `appSlug` through to `evaluateDetails`;
- passes `userId` / `organizationId` / `visitorId` through;
- returns the null-decision path when `evaluateDetails` returns `error`;
- returns the null-decision path when `evaluateDetails` returns no `data`;
- calls `evaluateDetails` exactly **once** for repeated calls with the same
  primitives (memoisation), asserted with `toHaveBeenCalledTimes(1)`;
- calls it again when a primitive differs;
- an undefined context behaves as all-undefined.

Follow `.agents/rules/testing.md`: assert exact call arguments with
`toHaveBeenCalledWith`, exact counts with `toHaveBeenCalledTimes`, and assert
complete result shapes — never a bare `toBeDefined()`.

## Rules that bind you

Read these three, then stop reading:
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/testing.md`
- `.agents/rules/feature-flags.md` (you must not alter any feature key spelling)

## Hard prohibitions

- Do **not** rename any exported app function.
- Do **not** touch `getFeatures`, `DEFAULT_UI_FEATURES`, `LEGACY_FEATURE_SLUGS`,
  `UI_FEATURES`, or any feature slug string.
- Do **not** import `react` into `packages/core`.
- Do **not** add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
- Do **not** run `git commit`, create a branch, or open a PR. The orchestrator commits.
- Do **not** touch any file outside the 11 listed plus
  `packages/core/src/platform/index.ts` and the experiments test file.

## Verify before you report

Run these one at a time (the host has limited RAM; do not run them in parallel):

```
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/crm typecheck
pnpm --filter @876/console typecheck
```

## Report

Write `plans/sep/19-lib-structure-consolidation/reports/opencode/2026-09-19-unit-a.md`:
files changed with reason; where `cache()` ended up and why; the **counted**
number of `it()` cases added; verification command output; anything you could not
verify; anything you deliberately left undone.
