# Architecture Decision Record: 024 — PostHog Experiments & Multivariate Testing

## Context

876 uses PostHog as the rollout provider of record for feature flags. However, running A/B/n experiments and multivariate tests requires assigning and tracking specific variant keys (e.g. `'control'`, `'treatment'`, `'variant_b'`) and optional configuration payloads attached to those variants.

Previously, the evaluation engine in `apps/api/src/providers/posthog/flags.ts` coerced any string variant to a boolean `true`, discarding the assigned variant name. In addition, evaluation was restricted to authenticated `userId`s, precluding top-of-funnel experiments for anonymous traffic.

## Decisions

### 1. Server-Side Evaluation Authority

- Flag and experiment evaluation remains strictly server-side inside `apps/api` via `posthog-node`.
- Browser client code never interacts directly with PostHog's management or evaluation endpoints.
- One `evaluateFlags()` call is made per evaluation and scoped with `flagKeys`; deprecated `getFeatureFlag` and `getFeatureFlagPayload` APIs must not be reintroduced.
- `FeatureFlagEvaluations.getFlag()` emits `$feature_flag_called` on first access per `(distinctId, flag, value)` tuple, deduped by the SDK.

### 2. Multivariate Variant & Payload Resolution

- `FeatureFlagEvaluator.evaluate()` returns `Map<string, { enabled: boolean; variant: string | null; payload: unknown }>`; absent payloads are `null`.
- Payloads are read from the `evaluateFlags()` snapshot without a second provider request.

### 3. Absolute Precedence of Local Platform Governance

Local governance always wins over provider rollout:

1. **Global Kill Switch**: If `feature.enabled` is `false` in the local Postgres catalog, the decision evaluates to `enabled: false`, `variant: null`, and `payload: null`.
2. **Parent / Child Hierarchy**: If a parent feature is disabled, the child is disabled and its variant is cleared.
3. **Overrides**: Explicit organization and user feature grants override rollout status.
4. **Subscription Entitlements**: Module and product tier entitlements apply on top.

### 4. Anonymous Visitor Support

- `FeatureEvaluationContext` accepts an optional `visitorId`.
- When `userId` is null, a supplied `visitorId` is passed as the `distinctId` to PostHog, allowing landing page, registration, and onboarding experiments. Establishing a durable visitor id is a per-app concern and is not yet implemented.

### 5. Unified Client Access Pattern

- `@876/platform` and `@876/core/platform` expose `getExperiment<T>(featureSlug, context)` returning:
  ```ts
  type ExperimentDecision<T = unknown> = {
    key: string
    enabled: boolean
    variant: string | null
    payload: T | null
    isControl: boolean
  }
  ```
- Product apps export dedicated helpers (e.g. `getBillingExperiment`, `getConsumerExperiment`, `getCrmExperiment`, `getCouriersExperiment`, `getInvoiceExperiment`, `getProjectsExperiment`, `getConsoleExperiment`).
- `resolveExperimentDecision` is the single decision resolver; package `getExperiment` methods remain thin transport wrappers over it.

## Follow-up

- Each app must decide how it establishes a durable anonymous `visitorId` before relying on long-lived anonymous experiment assignments.
