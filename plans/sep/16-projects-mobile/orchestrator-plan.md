# Orchestrator Plan: 876 Projects Mobile

- **Run ID:** `2026-09-16-projects-mobile`
- **Branch:** `feature/projects-mobile`
- **Role:** GPT-web / remote orchestrator support
- **Status:** `IN_PROGRESS` — planning-only setup; no implementation started
- **Master plan:** `./plan.md`

## 1. Purpose

This file defines what the remote/orchestrator side is responsible for while the user drives implementation locally with Muse Spark 1.3 Contributor through Codex.

The orchestrator is **not** the primary code writer for this run unless the user explicitly changes that arrangement. Its job is to keep the architecture coherent, maintain the durable plan, prepare precise implementation briefs when useful, review local output, and protect the security/product boundaries before phase work lands on the integration branch.

## 2. Current setup-pass scope

Authorized in the current turn:

- create `feature/projects-mobile` from current `main`;
- research current Expo/React Native guidance;
- create durable planning files;
- record architecture constraints and handoff instructions.

Explicitly out of scope in the current turn:

- no `apps/projects-mobile` scaffold;
- no dependency changes;
- no Expo config;
- no Core OAuth changes;
- no Projects API changes;
- no Projects SDK changes;
- no migrations;
- no implementation phase branch;
- no PR.

## 3. Orchestrator responsibilities after implementation is authorized

### 3.1 Maintain architecture truth

Keep `plan.md` current as implementation reveals facts that differ from the initial assumptions.

For every premise that changes, record:

- what the plan assumed;
- what the repository/runtime actually showed;
- the decision taken;
- affected phases;
- whether any already-written implementation must be corrected.

Do not preserve a stale plan merely because implementation has started.

### 3.2 Guard bounded-context ownership

Review every cross-service change for these invariants:

- Core owns identity, OAuth, organizations, app assignments, effective permissions, and module entitlements;
- Projects API owns Projects business behavior;
- `@876/projects` owns public Projects contracts/resource clients;
- the Expo host owns native presentation/session persistence only;
- session routing reuses the existing Projects service implementation instead of copying it;
- product resources never move onto `$876`/Account merely for mobile convenience.

### 3.3 Protect credential boundaries

Any local change touching auth/session/key handling gets priority review.

Reject designs that place any of the following in the app bundle:

- internal Projects key;
- Core service/app secret;
- OAuth client secret;
- operator credential;
- database/provider secret.

Native auth must remain a public-client flow with bearer/session authority resolved by the backend.

### 3.4 Review API session-tier implementation

Before accepting the Projects session API phase, verify:

- bearer verification is canonical/reused rather than a third JWT implementation;
- issuer/audience/purpose/expiry are checked;
- acting subject comes from verified token context;
- organization isolation is server-side;
- app entitlement + app assignment + module availability + effective permission are separate checks where applicable;
- existing internal/operator/service/integration paths are not weakened;
- route/controller/service boundaries remain compliant with Express rules;
- negative auth tests materially prove denial paths.

### 3.5 Review SDK authority separation

Before accepting `@876/projects/session`, verify:

- caller authority is visible in the import path;
- the session graph does not import `server-only`;
- resources are not duplicated merely to change headers/routes;
- existing resource schemas and result envelopes remain canonical;
- session transport sends bearer access token and never internal key;
- internal/operator/service clients remain compatible.

### 3.6 Review Expo scaffold against current docs

The orchestrator should refresh official Expo docs if implementation occurs materially later than this planning date.

At current baseline, verify:

- SDK 57-compatible packages are installed through Expo tooling;
- no stale hand-written monorepo Metro hacks are added by default;
- development build is used instead of treating Expo Go as the shipping workflow;
- Expo Router owns app navigation;
- Expo Router protected routes are treated only as client navigation UX, not authorization;
- SecureStore contains token material;
- AuthSession uses PKCE/public-client semantics;
- TanStack Query native focus and connectivity managers are wired;
- CNG is preserved unless a deliberate native ownership decision is documented.

### 3.7 Watch the React version mismatch

The repository root currently has React `19.2.8`; Expo SDK 57 documents React `19.2.3`.

The orchestrator must reject speculative global changes.

Required evidence before any root React change:

1. generated Expo app package versions;
2. root `pnpm install` result;
3. `expo-doctor` result;
4. actual Metro/resolution evidence;
5. impact analysis on existing Next.js apps.

If the app works with package-local Expo-compatible React resolution, prefer that over changing the entire monorepo.

### 3.8 Keep production-only API policy explicit

The mobile client intentionally points Projects traffic to the production Projects API even during development.

Review for accidental additions of:

- localhost fallback;
- dev/staging Projects base URL;
- public env-based override;
- hidden endpoint selector.

Mocks in tests are allowed. Runtime business traffic overrides are not.

### 3.9 Review organization cache isolation

Every organization-scoped query key must include the organization ID or otherwise be structurally isolated.

Workspace switch/logout must invalidate/remove prior-org data before the next workspace renders.

This is both correctness and data-isolation work, not a cosmetic cache choice.

## 4. Planned remote/orchestrator workflow

When the user asks the orchestrator to participate during implementation:

1. fetch the latest `feature/projects-mobile` head;
2. re-read `plan.md`, this file, and the latest local report/handoff;
3. compare the integration branch with `main` for upstream drift;
4. inspect the exact phase diff, not only its report;
5. verify the phase against relevant rule files;
6. update the master checklist/decision log as evidence changes;
7. write a narrowly scoped follow-up brief only if the local Muse run needs correction or the next phase benefits from a formal brief;
8. never claim local verification passed unless command output/report actually proves it;
9. leave implementation ownership local unless the user explicitly asks GPT-web to author code.

## 5. Briefing strategy for the local driver

Prefer one phase brief per security/product boundary rather than one enormous implementation prompt.

Future brief location:

```text
plans/sep/16-projects-mobile/briefs/codex/
```

Recommended brief sequence:

```text
01-reconnaissance.md
02-native-oauth-client.md
03-projects-session-api.md
04-projects-session-sdk.md
05-expo-scaffold.md
06-native-auth-workspace.md
07-query-foundation.md
08-projects-issues.md
09-comments.md
10-notifications-home.md
11-hardening-device.md
```

Every brief should include:

- exact base/integration branch;
- exact file/package scope;
- premises to verify before editing;
- rules to read;
- architecture invariants;
- explicit forbidden shortcuts;
- minimum negative tests for auth/data isolation;
- verification commands;
- report path.

## 6. Review gates by phase

### Gate A — Reconnaissance

Must identify:

- deployed/current Core OAuth issuer and public-client registration path;
- canonical JWT verifier/session guard owner;
- actual Projects service methods reused by session routes;
- exact `@876/projects` transport/resource graph;
- Expo-generated package baseline.

Do not approve implementation based on guesses.

### Gate B — OAuth/session security

Must pass a design/security review before feature UI proceeds.

Look first for:

- secret leakage;
- redirect URI validation weakness;
- missing PKCE enforcement;
- refresh-token rotation races;
- bearer audience/issuer mistakes;
- client-controlled actor/org authority;
- fail-open entitlement/permission behavior.

### Gate C — API/SDK compatibility

Must prove existing web/Console/operator/service/integration behavior is unchanged.

### Gate D — Native foundation

Must pass:

- `expo-doctor`;
- TypeScript/lint/tests for the native package;
- monorepo install resolution;
- physical development-build launch.

### Gate E — Data isolation

Must prove:

- cross-org API rejection;
- org-scoped query/cache isolation;
- logout clearing;
- stale revoked app access fails server-side.

### Gate F — Device release candidate

Must exercise real production Projects data using a dedicated safe test organization/account and verify Projects, Issues, and Comments end to end.

## 7. Documentation the orchestrator should keep current

At minimum:

- `plan.md` — source of truth;
- `orchestrator-plan.md` — remote responsibilities;
- `local-muse-codex-plan.md` — local operating procedure;
- phase briefs;
- phase reports;
- final `docs/876-projects-mobile.md` once implementation exists.

Do not create run logs/transcripts.

## 8. What the orchestrator will not do by default

- It will not create a parallel mobile backend.
- It will not move Projects resources onto Account/Workspace.
- It will not approve secrets in native builds.
- It will not accept navigation hiding as authorization.
- It will not duplicate API business logic into session controllers.
- It will not introduce custom Metro configuration because older blog posts recommend it.
- It will not globally repin React based only on Expo's compatibility table.
- It will not add Redux without a demonstrated state problem not already owned by navigation, SecureStore/session state, or TanStack Query.
- It will not implement offline mutation sync in v1 without an explicit new design phase.
- It will not claim physical-device success from unit/type checks alone.

## 9. Current handoff

Completed by the orchestrator setup pass:

- `feature/projects-mobile` cut from `main` @ `8304130e0318d72aff50c2f0d222ae7f47c488d3`;
- repository operating rules reviewed for planning scope;
- current official Expo/React Native/TanStack guidance researched;
- master plan authored;
- this orchestrator plan authored;
- local Muse/Codex operating plan authored separately.

No implementation is authorized or started yet.
