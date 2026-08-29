# Brief: route feature-flag evaluation through PostHog, sync back to the local DB

Model: gpt-5.6-terra, reasoning effort high. Repo root: /root/projects/876.
Branch is already created and checked out: `feat/posthog-flag-evaluation` (from `main`).
**Do not commit, do not branch, do not push.** The orchestrator stages and commits.

## The problem

`apps/api` treats its own `features` table as the sole authority for flag
evaluation. `evaluateDetailed()` in `apps/api/src/services/features.ts` seeds
every rollout decision from the local `feature.enabled` column and never asks
PostHog anything. PostHog is used only as a _management mirror_ (create/update/
delete a flag definition) via `apps/api/src/providers/posthog/client.ts`.

The consequence, and the reason for this work: **PostHog receives no
`$feature_flag_called` events**, so every flag in the PostHog dashboard shows
zero calls, zero exposure data, and no analytics. The flags are, as the product
owner put it, "masked away under our own local feature flags."

## The change, in one sentence

**PostHog becomes the authority for the rollout dimension of a flag decision and
therefore receives the exposure/tracking events; the local `features` table
becomes a synced record of PostHog's state (so the platform can migrate off
PostHog later) plus the platform's own governance layer (kill switch, org/user
grants, parent/child, module entitlement), which continues to be applied locally
and continues to win.**

## Invariants you must not break

These come from `.claude/rules/feature-flags.md` and the existing tests. Read
that rule file before writing code.

1. **A local kill switch can never be revived by PostHog.** `feature.enabled` is
   still ANDed into the result. If the local row says disabled, the feature is
   off no matter what PostHog returns.
2. **Grants still win over rollout.** An `OrgFeature`/`UserFeature` grant
   overrides the rollout decision exactly as it does today (`mergeGrants`), and a
   user grant still beats an organization grant.
3. **Parent/child stays AND-ed.** A child is live only when its master is too.
4. **Module entitlement is unchanged.** `moduleGated`/`moduleEntitled` logic is
   untouched.
5. **Evaluation must never fail because PostHog is unreachable.** Any PostHog
   error, timeout, or missing configuration falls back to the current local-only
   behaviour, logs once, and returns a normal result. No throw, no 5xx.
6. **No flag key format changes.** Keys stay `<app>_<group>_<child>` and remain
   identical in PostHog, the `features.slug` column, and code.
7. Existing API contracts (`/features/evaluate`, `/features/evaluate/details`,
   `/features/evaluate/me`) keep their current response shapes. You may **add**
   one new field to the details decision (see Phase 3); you may not rename or
   remove anything.

## Phase 1 — a PostHog evaluation adapter

New file: `apps/api/src/providers/posthog/flags.ts`.

- Use the **`posthog-node`** package (already a root dependency, version 5.49.1;
  add it to `apps/api/package.json` dependencies pinned to that exact version).
  Do not hand-roll `/decide` with `fetch`.
- Export a `FeatureFlagEvaluator` type:

  ```ts
  export type FeatureFlagEvaluator = {
    evaluate(params: {
      distinctId: string
      slugs: string[]
      groups?: Record<string, string>
      personProperties?: Record<string, string>
      groupProperties?: Record<string, Record<string, string>>
    }): Promise<Map<string, boolean>>
    shutdown(): Promise<void>
  }
  ```

- Export `getPostHogFlagEvaluator(settings): FeatureFlagEvaluator | null`. It
  returns `null` when `POSTHOG_PROJECT_API_KEY` or `POSTHOG_HOST` is unset —
  that is the "not configured, fall back to local" path, not an error.
- **One module-level `PostHog` client singleton**, constructed lazily, never one
  per request. Construct it with `{ host, personalApiKey, featureFlagsPollingInterval }`
  when `POSTHOG_PERSONAL_API_KEY` is present: that enables posthog-node's
  **local evaluation**, which polls flag definitions in the background so a
  decision costs no HTTP round trip per request. Without the personal key it
  falls back to remote evaluation, which still works.
- `evaluate()` calls `client.getFeatureFlag(slug, distinctId, { groups,
personProperties, groupProperties, sendFeatureFlagEvents: true })` for each
  slug, in parallel with `Promise.all`.
  **`sendFeatureFlagEvents: true` is the entire point of this change** — it is
  what makes posthog-node emit the `$feature_flag_called` event that produces
  the dashboard analytics. Do not set it to false, and do not use
  `getAllFlags()`, which does not emit those events.
- Coerce the result: `true`/`false` map straight through; a **string variant**
  maps to `true` (a variant means the flag is on); `undefined` means "PostHog has
  no opinion on this key" and must be **omitted from the returned Map**, not
  recorded as `false` — the caller distinguishes "PostHog says off" from
  "PostHog does not know this flag".
- Wrap the whole `evaluate()` body so a rejection resolves to an **empty Map**
  after `log.warn(..., 'posthog.flag_evaluation_failed')`. Never rethrow. Apply
  a hard timeout (`Promise.race`, 3000 ms, name the constant) so a slow PostHog
  cannot hold a request open.
- Never log the API keys. Log slugs and counts only.
- `shutdown()` calls `client.shutdown()` so queued events flush on SIGTERM.

## Phase 2 — wire it into evaluation

File: `apps/api/src/services/features.ts`.

- Add an optional `flagEvaluator?: FeatureFlagEvaluator | null` to `FeaturesDeps`.
  Optional so every existing test that constructs `FeaturesDeps` keeps compiling.
- In `evaluateDetailed()`, after `features` is loaded and **before**
  `rolloutDecisions` is populated:
  - Skip PostHog entirely when `settings.featureFlags.evaluationSource !== 'posthog'`,
    when `deps.flagEvaluator` is null, or when `context.userId` is null (there is
    no one to attribute an exposure to — an anonymous evaluation stays local).
  - Otherwise call
    `deps.flagEvaluator.evaluate({ distinctId: context.userId, slugs: features.map(f => f.slug), groups: context.organizationId ? { organization: context.organizationId } : undefined })`.
- Seed `rolloutDecisions` as: `posthogDecisions.get(feature.slug) ?? feature.enabled`.
  Everything downstream — `mergeGrants`, `resolve()`, module eligibility — is
  **unchanged**. Note that `resolve()` already ANDs `feature.enabled`, which is
  what preserves invariant 1; do not remove that.
- Track, per feature, whether the rollout number came from PostHog or the local
  row, and expose it on the decision (Phase 3).

## Phase 3 — surface the source

- Add `rolloutSource: 'posthog' | 'local'` to `FeatureEvaluationDecision` in
  `apps/api/src/services/features.ts`.
- Serialize it as `rollout_source` (snake_case wire field) in
  `evaluateFeatureDetails` in `apps/api/src/modules/features/features.service.ts`,
  and add it to the Zod response schema in
  `apps/api/src/modules/features/features.schemas.ts` and the OpenAPI docs in
  `features.docs.ts`.
- Mirror the new field on the client types so Console can read it:
  - `packages/core/src/platform/types.ts` (the feature-evaluation row type),
  - `packages/admin/src/resources/features.ts` if it restates the shape.
    It is a **new optional field** on a response — additive, non-breaking.
- Console: on the feature detail/evaluation surface under
  `apps/console/src/app/(app)/features/`, show the source as a small muted
  metadata value ("Rollout source: PostHog" / "Local"). Tier 3 per
  `.claude/rules/app-layout.md` §12 — muted text, no new badge colour, **no
  explanatory paragraph** under any heading (`CLAUDE.md` → UI Copy). Keep it
  minimal; if the cleanest placement is a single row in an existing detail list,
  that is the right answer.

## Phase 4 — the background sync worker

The local table must stay a faithful record of PostHog's state so the platform
can migrate away from PostHog without losing anything.

New files, following the exact shape of the existing
`apps/api/src/workers/billing-customer-dispatch.ts` +
`billing-customer-dispatch.repository.ts` pair (read both first; match their
structure, their `getLogger` naming, their `start*Worker(): { stop }` signature,
and their summary-object return):

- `apps/api/src/workers/feature-flag-sync.repository.ts`
- `apps/api/src/workers/feature-flag-sync.ts`

Behaviour of one pass:

1. If PostHog management is not configured, return `{ configured: false, ... }`
   and do nothing. No throw.
2. `listFeatures()` from the existing `PostHogClient`
   (`apps/api/src/providers/posthog/client.ts`) — it already paginates.
3. Index the PostHog flags by their `key`.
4. For each **existing local** feature row, matched by `slug === key`, update
   only when a value actually changed:
   - `provider` → `'posthog'`
   - `providerFeatureId` → PostHog's `id` as a string
   - `enabled` → PostHog's `active`
   - `providerMetadata` → the rollout-relevant subset of the PostHog payload
     (`active`, `filters`, `rollout_percentage`, variants, `deleted`) — store a
     bounded object, not the whole raw response
   - `syncedAt`/`updatedAt` → `nowUnixSeconds()`
5. **Never create and never delete a local feature row.** Creation belongs to the
   seeds (`apps/api/src/seeds/features.ts`); a PostHog key with no local row is
   logged once as `feature_flag_sync.unmapped_key` and skipped. A local row with
   no PostHog key is logged as `feature_flag_sync.missing_provider_flag` and left
   untouched.
6. Return a summary `{ configured, scanned, updated, unmapped, missing }` and log
   it at info.

Register it in `apps/api/src/server.ts` beside `startBillingWorker` and
`startFinanceWorker` — same dependency-injection shape, same start/stop
lifecycle, same `stop()` handling in the shutdown path. Also call the flag
evaluator's `shutdown()` in that shutdown path so queued PostHog events flush.

## Phase 5 — configuration

In `apps/api/src/config/index.ts`, add to the env schema and the settings object:

- `FEATURE_FLAG_EVALUATION_SOURCE` — `'posthog' | 'local'`, default `'posthog'`.
  The escape hatch that restores today's behaviour without a deploy rollback.
- `FEATURE_FLAG_SYNC_INTERVAL_SECONDS` — int, default `300`, min `30`, max `3600`.
- `FEATURE_FLAG_SYNC_ENABLED` — bool, default `true`.

Expose them under a `featureFlags` key on the settings object (`evaluationSource`,
`syncIntervalSeconds`, `syncEnabled`) — camelCase in TypeScript, matching how
`posthog` and `stripe` are already grouped there.

Add all three to `apps/api/.env.example` beside the existing `POSTHOG_*` block,
and add `POSTHOG_PROJECT_API_KEY=` there too — it is read by
`apps/api/src/config/index.ts` today but is **missing from that file**, which is
the exact class of gap `.claude/rules/env-configuration.md` exists to prevent.
Mark each new variable `# optional — <why>` since all three have in-code defaults.

## Phase 6 — tests

Follow `.claude/rules/testing.md` — assert full shapes, exact call arguments, and
exact call counts; every test must be able to fail.

Add to `apps/api/src/services/__tests__/features.test.ts` (or a sibling file if
that one is already large):

- PostHog says a flag is on, the local row says `enabled: true`, no grants → enabled.
- **PostHog says on, the local row says `enabled: false` → disabled.** This is the
  kill-switch invariant; assert `rolloutSource` and the final `enabled` both.
- PostHog says off, an org grant says enabled → enabled (grant beats rollout).
- PostHog says off, a user deny with an org grant enabled → disabled.
- PostHog knows nothing about the slug → falls back to `feature.enabled`, and
  `rolloutSource === 'local'`.
- The evaluator rejects → the whole evaluation still resolves, every decision has
  `rolloutSource === 'local'`, and the result equals the pure-local result.
- `context.userId === null` → the evaluator is **not called**
  (`expect(evaluate).not.toHaveBeenCalled()`), decisions are local.
- `evaluationSource: 'local'` → the evaluator is not called.
- Parent disabled in PostHog, child enabled in PostHog → child disabled.

Add `apps/api/src/providers/posthog/__tests__/flags.test.ts`:

- A string variant response coerces to `true`.
- `undefined` is omitted from the Map rather than recorded as `false`.
- `getFeatureFlag` is called with `sendFeatureFlagEvents: true` — assert the exact
  options object. This is the test that stops someone silently disabling the
  tracking this whole change exists to enable.
- `groups` carries `{ organization: <orgId> }` when an organization id is present,
  and is absent when it is not.
- A rejecting client resolves to an empty Map and does not throw.

Add `apps/api/src/workers/__tests__/feature-flag-sync.test.ts`:

- An unchanged row issues **no** update (assert `updateFeature` call count is 0).
- A changed `active` writes `enabled` plus `syncedAt`; assert the full update arg.
- A PostHog key with no local row increments `unmapped` and writes nothing.
- A local row with no PostHog key increments `missing` and is not modified.
- Unconfigured → `{ configured: false }`, no repository calls at all.

## Phase 7 — documentation

- Update `.claude/rules/feature-flags.md`: a new short section stating that
  PostHog is the evaluation authority for the rollout dimension, that local
  governance (kill switch, grants, parent/child, modules) is applied on top and
  still wins, that evaluation falls back to local on any PostHog failure, and
  that the sync worker keeps the local table a migratable record. Keep it tight
  and in the file's existing voice. **Mirror the edit into `.agents/rules/` and
  `.grok/rules/`** — `CLAUDE.md` requires all three trees to stay in sync.
- Update `apps/api/README.md` (or the closest existing package-local doc) with the
  three new env vars and the worker.

## Verification — run every one of these, in the foreground, and report real output

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test
pnpm --filter @876/console typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/admin typecheck
```

Report the actual pass/fail and the test counts before and after. Do not claim a
green check you did not run.

## Hard constraints

- **Never add an `eslint-disable` comment or an `as any` cast to satisfy a gate.**
  If lint or the type checker objects, fix the underlying code. A previous
  delegated run on this repo satisfied lint by disabling it at the top of every
  file it wrote; that will be caught and rejected.
- Only `*.repository.ts` may import the Prisma client
  (`.claude/rules/express-api.md`). The new worker's DB access goes in its
  `.repository.ts`.
- No business logic in controllers; no `req`/`res` types in services.
- Zod stays the single source of truth for the contract — do not hand-write
  OpenAPI.
- Do not rename any database table, column, env var, error code, route path, or
  operation id (`.claude/rules/naming.md`).
- Do not run any database migration. No schema change is required by this brief —
  every column you write already exists on the `Feature` model.
- Do not touch `pnpm-lock.yaml` beyond what adding the pinned `posthog-node`
  dependency to `apps/api/package.json` requires.
