# Implementation Plan: PostHog Experiments Base Setup Across All Apps

- **Run ID:** `2026-09-06-posthog-experiments-base-setup`
- **Branch:** `feature/posthog-experiments-base-setup` (to be cut from up-to-date `main` per [git.md](file:///root/projects/876/.claude/rules/git.md))
- **Status:** `IN_REVIEW` (Gemini pass implemented; corrections delegated to Codex `gpt-5.6-terra` medium — see `briefs/codex/2026-09-06-experiments-corrections.md`)
- **Scope:** Base platform infrastructure, contracts, shared packages, and per-app base setup to enable PostHog experiments (multivariate A/B/n testing and variant payloads) across the entire 876 ecosystem.
- **Reference Rules:** [.claude/rules/git.md](file:///root/projects/876/.claude/rules/git.md), [.claude/rules/cli.md](file:///root/projects/876/.claude/rules/cli.md), [.claude/rules/feature-flags.md](file:///root/projects/876/.claude/rules/feature-flags.md)

---

## 1. Context & Motivation

A comprehensive audit of the PostHog deployment (`876 Ecosystem - Production`, ID `293071`) and codebase revealed that while feature flags are server-side evaluated through PostHog, **experiments are currently blocked by architectural gaps**:

1. **Boolean Coercion**: [apps/api/src/providers/posthog/flags.ts](file:///root/projects/876/apps/api/src/providers/posthog/flags.ts) collapses any returned string variant (e.g., `'control'`, `'treatment'`) into `true` (`value !== false`), discarding the specific variant identifier.
2. **Missing Variant Payloads**: Flag payloads are not fetched or surfaced.
3. **Truncated API Contracts**: The API schemas in [apps/api/src/modules/features/features.schemas.ts](file:///root/projects/876/apps/api/src/modules/features/features.schemas.ts) and types in [packages/core/src/platform/types.ts](file:///root/projects/876/packages/core/src/platform/types.ts) only accept `enabled: boolean`.
4. **Anonymous Visitor Exclusion**: Pre-authentication and top-of-funnel surfaces (landing pages, sign-up flows) are skipped because evaluation requires `context.userId`.
5. **No Per-App Experiment Primitives**: Next.js apps lack a standard, typed `getExperiment` server helper or `useExperiment` client hook.

The goal of this run is to establish the **base setup** across all apps and data planes without deploying actual active experiments into production.

---

## 2. Core Architectural Principles & Invariants

Per [.claude/rules/feature-flags.md](file:///root/projects/876/.claude/rules/feature-flags.md):

1. **Server-Side Evaluation Only**: App code does not call PostHog from the browser. All experiment variant determinations occur server-side in `@876/api` or during Next.js server-side rendering via `$876` / platform clients.
2. **Exposure Tracking Preserved**: `$feature_flag_called` must still fire so experiment analytics work. In posthog-node 5.x this is emitted by `FeatureFlagEvaluations.getFlag()` on first access per `(distinctId, flag, value)`, deduped by the SDK. The `sendFeatureFlagEvents` option is **deprecated and has no effect** — do not rely on it.
3. **Local Governance Wins**:
   - A disabled local feature (kill switch) disables the experiment entirely (`variant = null`, `enabled = false`).
   - Explicit user/org grants override rollout variants where specified.
   - Parent feature dependencies and module entitlements remain strictly enforced.
4. **Resilience & Zero Outages**: Any PostHog error, timeout (>3s), or misconfiguration falls back to local control/default state without 5xx errors or broken page renders.
5. **Durable Key Standard**: Experiment flag keys follow `<app>-<feature>` or `<app>-exp-<name>` in kebab-case.

---

## 3. Phased Implementation Breakdown

### Phase 1: PostHog Adapter & Multivariate Evaluation (`@876/api`)

**Target Files:**
- [apps/api/src/providers/posthog/flags.ts](file:///root/projects/876/apps/api/src/providers/posthog/flags.ts)
- [apps/api/src/providers/posthog/__tests__/flags.test.ts](file:///root/projects/876/apps/api/src/providers/posthog/__tests__/flags.test.ts)

**Key Changes:**
- Upgrade `FeatureFlagEvaluator` return type to preserve variant and optional payload:
  ```ts
  export type FeatureEvaluationResult = {
    enabled: boolean
    variant: string | null
    payload?: unknown
  }
  export type FeatureFlagEvaluator = {
    evaluate(params: {
      distinctId: string
      slugs: string[]
      groups?: Record<string, string>
      personProperties?: Record<string, string>
      groupProperties?: Record<string, Record<string, string>>
      includePayloads?: boolean
    }): Promise<Map<string, FeatureEvaluationResult>>
    shutdown(): Promise<void>
  }
  ```
- Evaluate with a **single** `posthog.evaluateFlags(distinctId, { flagKeys: slugs, ... })` call per evaluation, reading `getFlag()` / `getFlagPayload()` off the returned snapshot.
- `getFeatureFlag`, `getFeatureFlagPayload`, and `isFeatureEnabled` are **deprecated** in posthog-node 5.49 and must not be reintroduced. The per-slug loop they required cost N requests; `evaluateFlags` costs one.
- Drop `sendFeatureFlagEvents` — no effect in 5.x; exposure fires on snapshot access.

---

### Phase 2: Feature Service, Routing & Serialization (`@876/api`)

**Target Files:**
- [apps/api/src/services/features.ts](file:///root/projects/876/apps/api/src/services/features.ts)
- [apps/api/src/modules/features/features.schemas.ts](file:///root/projects/876/apps/api/src/modules/features/features.schemas.ts)
- [apps/api/src/modules/features/features.service.ts](file:///root/projects/876/apps/api/src/modules/features/features.service.ts)
- [apps/api/src/modules/features/features.docs.ts](file:///root/projects/876/apps/api/src/modules/features/features.docs.ts)
- [apps/api/src/services/__tests__/features.test.ts](file:///root/projects/876/apps/api/src/services/__tests__/features.test.ts)

**Key Changes:**
- Extend `FeatureEvaluationContext` to accept an optional `visitorId?: string` when `userId` is null (enabling anonymous experiment assignment).
- Add `variant: string | null` and `payload?: unknown` to `FeatureEvaluationDecision` and `FeatureEvaluationResult`.
- Update API Zod schemas:
  - Add optional `variant: z.string().nullable().optional()` and `payload: z.unknown().optional()` to feature evaluation responses.
  - Allow passing `visitorId` in query parameters (camelCase only, matching `userId`/`organizationId`; no snake_case alias).
- Ensure local kill switches set `enabled: false` and clear `variant: null`.

---

### Phase 3: Shared Platform Packages (`@876/core`, `@876/platform`, `@876/sdk`)

**Target Files:**
- [packages/core/src/platform/types.ts](file:///root/projects/876/packages/core/src/platform/types.ts)
- [packages/platform/src/types.ts](file:///root/projects/876/packages/platform/src/types.ts)
- [packages/platform/src/resources/features.ts](file:///root/projects/876/packages/platform/src/resources/features.ts)
- [packages/sdk/src/client.ts](file:///root/projects/876/packages/sdk/src/client.ts) (or SDK feature resource)

**Key Changes:**
- Update `PlatformFeature`, `PlatformFeatureEvaluationDecision`, and `AdminFeature` types with `variant?: string | null` and `payload?: unknown`.
- Add a typed helper `getExperiment(featureKey: string)` on the platform client that returns:
  ```ts
  type ExperimentDecision<T = unknown> = {
    key: string
    enabled: boolean
    variant: string | null
    payload: T | null
    isControl: boolean
  }
  ```

---

### Phase 4: Base Setup Across All Product & Internal Apps

Establish the base setup across all 8 Next.js applications in the monorepo:

| App | Path | Primary Experiment Scope | Base Setup Deliverable |
| :--- | :--- | :--- | :--- |
| **`@876/app`** | `apps/876` | Onboarding flows, consumer features, PWA install prompts | Experiment context helper (`getConsumerExperiment`) |
| **`@876/enterprise`** | `apps/enterprise` | Org onboarding, seat upgrade flows, workspace layouts | Server helper `getEnterpriseExperiment()` |
| **`@876/console`** | `apps/console` | Internal admin workflows, operator tools | Diagnostic view update in `/features/diagnostics` showing variant/payload |
| **`@876/couriers-app`**| `apps/couriers` | Driver dispatch, routing cards, package intake UI | Server helper `getCouriersExperiment()` |
| **`@876/billing-app`** | `apps/billing` | Checkout tiers, payment method prioritization, billing UI | Server helper `getBillingExperiment()` in `src/lib/features.ts` |
| **`@876/invoice`** | `apps/invoice` | Invoice layout presets, PDF generator defaults | Server helper `getInvoiceExperiment()` |
| **`@876/crm`** | `apps/crm` | Deal board layouts, contact timeline formats | Server helper `getCrmExperiment()` in `src/lib/features.ts` |
| **`@876/projects`** | `apps/projects` | Issue boards, project overview layouts | Server helper `getProjectsExperiment()` |

**Key Deliverables Per App:**
1. **Anonymous Visitor Plumbing**: `visitorId` is threaded end-to-end (schema → service → evaluator `distinctId` → clients → app helpers) so any caller-supplied visitor id can be evaluated. **Establishing** a durable visitor id is deferred: `.claude/rules/new-app-guide.md` §3c forbids `proxy.ts`/`middleware.ts` in every app, and an RSC cannot set a cookie — it needs a route handler, which is out of scope for the base setup. Tracked as a follow-up in ADR 024.
2. **Unified Feature Adapter**: Update each app's `src/lib/features.ts` (or equivalent) to parse and return `{ enabled, variant, payload }`.
3. **No Active Flags Yet**: No production flags will be created or toggled on; only type-safe infrastructure and fallback stubs.

---

### Phase 5: Documentation, Rules & Verification

**Target Files:**
- `.claude/rules/feature-flags.md`, `.agents/rules/feature-flags.md`, `.grok/rules/feature-flags.md`
- `apps/api/README.md`
- `docs/architecture/014-posthog-experiments.md`

**Key Deliverables:**
- Document experiment conventions (naming, multivariate variants, local kill switches).
- Add explicit instructions for creating PostHog experiments linked to canonical feature keys.
- Run complete verification across all affected workspaces.

---

## 4. Multi-Agent & Tool Delegation Matrix (Per `.claude/rules/cli.md`)

| Task / Subsystem | Tool / Model | Reason & Scope |
| :--- | :--- | :--- |
| **Design & Architecture Oversight** | Primary Agent (Fable/Opus high) | Architectural integrity, invariants, contract boundaries |
| **Phase 1: PostHog Adapter & Tests** | Codex (`gpt-5.6-terra`, high) | Focused module modification in `apps/api/src/providers/posthog/` |
| **Phase 2: API Services & Schemas** | Codex (`gpt-5.6-terra`, high) | Bounded Express service & Zod contract updates |
| **Phase 3: Core & Platform Types** | Primary Agent or Codex | Type consistency across shared packages |
| **Phase 4: Per-App Feature Adapters** | `opencode` (DeepSeek V4) or `agy` | Repetitive, mechanical helper additions across 8 apps |
| **Phase 5: Rule & Docs Mirroring** | `agy` (`gemini-3.8-flash-high`) | Markdown docs & rule sync across `.claude`, `.agents`, `.grok` |

---

## 5. Git & Verification Guidelines (Per `.claude/rules/git.md`)

- **Branching**:
  - Main feature integration branch: `feature/posthog-experiments-base-setup` (cut from `main`).
  - Phase branches target the integration branch.
- **Commit Granularity**:
  - Atomic commits with exact conventional commit headers:
    - `feat(posthog): support multivariate variants and payloads in flag evaluator`
    - `feat(api-features): expose experiment variant and payload on evaluation routes`
    - `feat(core-platform): add variant and payload to platform feature contracts`
    - `feat(apps): add base experiment helpers across all nextjs apps`
    - `docs(feature-flags): document posthog experiment lifecycle and conventions`
  - **NEVER** include `Co-Authored-By: Claude` or AI attribution trailers.
  - **NEVER** run `git commit` without explicit user confirmation.
- **Verification Gates (Must run in foreground)**:
  ```bash
  pnpm --filter @876/api typecheck
  pnpm --filter @876/api lint
  pnpm --filter @876/api test
  pnpm --filter @876/core typecheck
  pnpm --filter @876/platform typecheck
  pnpm --filter @876/sdk typecheck
  pnpm --filter @876/console typecheck
  pnpm --filter @876/876 typecheck
  pnpm --filter @876/enterprise typecheck
  pnpm --filter @876/billing-app typecheck
  pnpm --filter @876/couriers-app typecheck
  pnpm --filter @876/invoice typecheck
  pnpm --filter @876/crm typecheck
  pnpm --filter @876/projects typecheck
  node scripts/check-app-structure.mjs
  ```

---

## 6. Review of the Gemini Pass (2026-09-06)

The direction was sound and the phasing was right. Seven defects were found in the
implementation and delegated to Codex (`gpt-5.6-terra`, medium) for correction.

| # | Defect | Why it matters |
| :- | :- | :- |
| 1 | Built on `getFeatureFlag` + `getFeatureFlagPayload` | Both **deprecated** in posthog-node 5.49. The pair costs 2N `/flags` requests inside a 3s timeout; `evaluateFlags` costs **one**. |
| 2 | `sendFeatureFlagEvents: true` treated as the exposure mechanism | Marked `@deprecated THIS OPTION HAS NO EFFECT` in 5.x. Exposure actually fires on `FeatureFlagEvaluations.getFlag()`. The rules and ADR asserted the wrong mechanism. |
| 3 | `Map<string, FeatureEvaluationResult \| boolean>` with `as boolean` casts | The evaluator only returns the object form. Defensive narrowing for an impossible state — forbidden by `ai-code-quality.md`. |
| 4 | Both `visitorId` and `visitor_id` accepted | Dual property names; every sibling key is camelCase. Violates `naming.md`. |
| 5 | `getExperiment` duplicated verbatim in 3 places, result type in 4 | Explicitly forbidden ("never write a third copy"). Replaced by one `resolveExperimentDecision` in `@876/core`. |
| 6 | `EXPERIMENT_VISITOR_COOKIE` exported, read by nothing | Dead code. The cookie bridge it served could not be built as planned — `proxy.ts` is forbidden platform-wide and an RSC cannot set a cookie. |
| 7 | No memoization on the experiment helpers | Each `getExperiment` is a full `evaluate/details` round trip; two experiments on a page = two extra evaluations. `navigation-performance.md` Rule 3 requires these to be cheap — memoized with `React.cache` on primitive args. |

**Verified against the installed SDK**, not from memory: `posthog-node@5.49.1`
`dist/{client,types,feature-flag-evaluations}.d.ts`. `evaluateFlags()` landed in
PostHog/posthog-js#3476 (April 2026) as the single-call replacement.

### Follow-ups, deliberately out of scope

- Establishing a durable anonymous visitor id (needs a per-app route handler that sets
  the cookie; `visitorId` plumbing is already in place to receive it).
- Creating actual PostHog experiments — this run is base setup only, no active flags.
