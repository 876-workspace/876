# Implementation Plan: 876 Projects Mobile

- **Run ID:** `2026-09-16-projects-mobile`
- **Status:** `IN_PROGRESS` — planning foundation complete; implementation has not started
- **Integration branch:** `feature/projects-mobile`
- **Base:** `main` @ `8304130e0318d72aff50c2f0d222ae7f47c488d3`
- **Primary execution mode after approval:** local Muse Spark 1.3 Contributor through Codex (`-p muse`)
- **Planning date:** 2026-09-16

## 1. Objective

Build a scalable Android-first Expo/React Native client for 876 Projects that is a first-class client of the existing 876 identity, app-access, Projects API, and Projects domain contracts.

The first production-capable mobile release must let an authorized organization member:

- authenticate with their 876 account without embedding confidential credentials in the app;
- select an organization/workspace they are entitled and assigned to use;
- view all Projects they are authorized to see;
- view all Issues/work items they are authorized to see, not only assigned work;
- search/filter/paginate Projects and Issues using server-owned query semantics;
- open Project and Issue detail views;
- create and edit Issues where permitted;
- view complete Issue comment threads;
- create, edit, and delete comments where permitted;
- view Projects notifications and a mobile-oriented Home/My Work surface;
- always read and write Projects data against the production Projects API.

The mobile app is **not** a second Projects backend and is **not** a wrapper around the Projects Next.js app. Business behavior remains owned by `apps/projects-api`; domain contracts remain owned by `@876/projects`; account/workspace authorization remains owned by Core.

## 2. Explicit non-goals for the first implementation

Do not make the first release depend on implementing these web-heavy administration surfaces:

- Gantt editing, critical path, and baseline management;
- Reports administration and resource-capacity administration;
- project finance/rate/budget administration;
- template/layout/workflow/automation administration;
- custom-module administration;
- integration credentials, webhooks, imports, health administration;
- client-grant administration;
- offline mutation queues or conflict resolution;
- a separate mobile backend or mobile-specific database;
- a React DOM/shadcn compatibility layer.

These can be added incrementally after the core native execution experience is stable.

## 3. Binding repository rules

Before implementation, the local driver must read the current versions of:

- `CLAUDE.md`
- `.claude/rules/cli.md`
- `.claude/rules/implementation-tracker.md`
- `.claude/rules/ai-code-quality.md`
- `.claude/rules/naming.md`
- `.claude/rules/types.md`
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/rules/error-handling.md`
- `.claude/rules/git.md`
- `.claude/rules/api-backend.md`
- `.claude/rules/express-api.md`
- `.claude/rules/stripe-api-pattern.md`
- `.claude/rules/sdk-conventions.md`
- `.claude/rules/access-tiers.md`
- `.claude/rules/access-control.md`
- `.claude/rules/app-access.md`
- `.claude/rules/platform-services.md`
- `.claude/rules/deployment.md`

When a phase touches Storage/file uploads, also read `storage-architecture.md`. If a future native screen reuses a product screen already shared between hosts, read `shared-product-ui.md` before deciding whether a native-specific presentation package is justified.

The `.agents/rules/` mirror is the corresponding rules location for Codex/non-Claude agents. The local Muse/Codex driver must follow the mirror appropriate to its harness and must not add AI attribution to commits or PRs.

## 4. Current repository baseline

### 4.1 Workspace/tooling

The repository currently uses:

- `pnpm@11.3.0`;
- Node `>=22.13`;
- Turbo;
- TypeScript `5.9.3`;
- React `19.2.8` at the monorepo root;
- workspace globs `apps/*` and `packages/*`.

Therefore `apps/projects-mobile` will already be included by the existing pnpm workspace pattern. Do not add a second workspace mechanism.

### 4.2 There is no existing Expo host

A repository search on 2026-09-16 found no existing `expo-router`, `expo-secure-store`, `expo-dev-client`, or React Native app implementation to copy. The new native host should reuse 876 domain/auth contracts, not invent a native platform pattern from an unrelated local app.

### 4.3 Projects client is currently server/internal-key oriented

`@876/projects` currently exposes root, `service`, `operator`, `portal`, and `integration` entrypoints but no `session` entrypoint. Its current shared request transport expects an internal key and sends `x-internal-key`.

That credential can never be embedded in an APK. The mobile application requires an explicit signed-in-human/session Projects client and API surface.

### 4.4 Existing 876 architecture already defines the right principal

The access-tier rules define `session` as a signed-in human using a session cookie or bearer access token and require the API to resolve membership/permissions for that user. Additional principals route to the same owning business implementation rather than duplicating it.

This project must follow that model.

### 4.5 Existing OAuth/session infrastructure is reusable

Core already has an OAuth/OIDC provider with:

- authorization-code + PKCE support;
- bearer access tokens;
- refresh-token support and refresh-token rotation;
- discovery/userinfo/revoke endpoints;
- public-client-compatible SDK methods that do not require a client secret.

Couriers API already contains a mature session guard pattern that verifies a bearer JWT, checks `token_use === 'access'`, derives the acting user/app/realm, and supports issuer/audience/JWKS configuration. Projects API should reuse/promote the canonical platform primitive where possible rather than copy a third implementation.

## 5. Current external technical baseline (verified 2026-09-16)

Only official/current documentation should be used when implementing Expo-native setup.

### Expo version baseline

Expo's current SDK reference lists:

- Expo SDK `57.0.0`;
- React Native `0.86`;
- React `19.2.3`;
- Node `22.13.x` minimum line.

Source: <https://docs.expo.dev/versions/latest/>

**Important repo compatibility note:** the 876 root currently pins React `19.2.8`, while Expo SDK 57 documents React `19.2.3`. Do **not** globally downgrade or repin the monorepo React version just to satisfy the first scaffold. Create the Expo app with Expo-managed compatible package versions, install from the repository root, run `expo-doctor`, inspect Metro resolution, and make the smallest evidence-based workspace adjustment only if there is a demonstrated conflict.

### Expo monorepo guidance

Expo has first-class workspace/monorepo support for pnpm and automatically configures Metro when using `expo/metro-config`. SDK 52+ should not need legacy manual `watchFolders`, `resolver.nodeModulesPath`, `resolver.extraNodeModules`, or `disableHierarchicalLookup` configuration.

Source: <https://docs.expo.dev/guides/monorepos/>

Default decision: **do not add custom Metro monorepo configuration unless a real dependency-resolution failure proves it is needed.**

### Expo Router

Expo Router is the standard file-based routing layer. The current SDK 57 recommended package line is `~57.0.x` and SDK 56+ no longer recommends importing application navigation primitives directly from external `@react-navigation/*` packages when Expo Router provides the equivalent.

Source: <https://docs.expo.dev/versions/latest/sdk/router/>

Use Expo Router route groups and protected routes for native navigation UX, while preserving the rule that navigation protection is not API authorization.

Source: <https://docs.expo.dev/router/advanced/authentication/>

### Development builds

Expo explicitly describes Expo Go as a learning/playground environment and development builds with `expo-dev-client` as the appropriate production-grade workflow.

Sources:

- <https://docs.expo.dev/develop/development-builds/introduction/>
- <https://docs.expo.dev/develop/development-builds/faq/>

Use a development build from the start. Do not make Expo Go compatibility a product constraint.

### OAuth

Expo's current OAuth guidance recommends `expo-auth-session`, `expo-web-browser`, `AuthSession.makeRedirectUri()`, and the AuthSession request APIs for OAuth/OpenID flows.

Source: <https://docs.expo.dev/guides/authentication/>

The native app is a **public OAuth client**: PKCE is required and no OAuth client secret belongs in the bundle.

### TanStack Query on React Native

TanStack Query supports React Native, but the app must wire native lifecycle/network state into `focusManager` and `onlineManager` to get browser-equivalent focus/reconnect behavior.

Source: <https://tanstack.com/query/latest/docs/framework/react/react-native>

Use the default online mutation behavior; do not add an offline mutation queue in v1.

### EAS/runtime compatibility

Expo recommends treating native runtime compatibility explicitly when EAS Update is introduced. Any native dependency/config change can require a new build and compatible `runtimeVersion`.

Sources:

- <https://docs.expo.dev/eas-update/runtime-versions/>
- <https://docs.expo.dev/build/updates/>

EAS Update is not required to land the first functional mobile release, but the app scaffold must not make future adoption difficult.

## 6. Key architecture decisions

### AD-1 — New native host

Create the future app at:

```text
apps/projects-mobile/
```

Recommended package name:

```text
@876/projects-mobile
```

It is a separate host for the existing Projects bounded context.

### AD-2 — Production Projects data only

Production Projects origin:

```text
https://876-projects-api.vercel.app
```

The mobile runtime must not contain a development/staging/local Projects API switch.

Do not add:

- `EXPO_PUBLIC_PROJECTS_API_URL`;
- localhost fallback;
- LAN discovery;
- a hidden environment selector.

Tests may inject mock transports. Application runtime may not redirect normal Projects traffic away from production.

The production Core/OAuth issuer must be resolved from current deployment/repository truth during the implementation phase and similarly pinned as a public endpoint. Do not copy a stale historical Core URL from old documentation.

### AD-3 — No confidential credentials in native code

Never embed:

- `PROJECTS_INTERNAL_KEY`;
- any operator/service secret;
- any `876_app_secret_*` key;
- an OAuth client secret;
- database/provider secrets.

EAS secrets do not make a value safe if the value ultimately gets compiled into an APK/JS bundle.

### AD-4 — OAuth Authorization Code + PKCE

The native app uses 876 Core OAuth as a public client:

```text
Projects Mobile
  -> system browser / 876 authorization endpoint
  -> Authorization Code + S256 PKCE
  -> deep-link callback
  -> access token + rotating refresh token
```

Store token material only in `expo-secure-store`. Do not use AsyncStorage for bearer or refresh tokens.

### AD-5 — Session-tier Projects API

Add a dedicated session route family or typed route principal in `apps/projects-api`; do not weaken existing internal routes and do not reinterpret the internal key as a mobile credential.

Session route requests use:

```http
Authorization: Bearer <access-token>
```

API authorization must resolve:

```text
valid bearer token
AND active organization membership
AND active/trialing Projects app entitlement
AND active app assignment
AND module entitlement when the capability is module-backed
AND concrete effective app permission
```

The API derives acting user/org/app context from validated credentials and route scope, never from a body-supplied actor.

### AD-6 — Capability implementation stays single-owner

Projects, Issues, Comments, Notifications, My Work, etc. continue to invoke the existing owning service implementations. Session routing changes authentication/authorization/serialization/auditing where necessary; it does not fork business logic.

### AD-7 — `@876/projects/session`

Add an explicit native/browser-safe session entrypoint to the existing product package. Resource factories should be authority-neutral; the runtime/transport selects the required credential and route family.

Target consumer shape:

```ts
import { create876ProjectsSessionClient } from '@876/projects/session'
```

The session dependency graph must not transitively import `server-only`.

### AD-8 — Expo Router + route groups

Initial route concept:

```text
app/
├── _layout.tsx
├── sign-in.tsx
├── auth/
│   └── callback.tsx
└── (app)/
    ├── _layout.tsx
    ├── (tabs)/
    │   ├── _layout.tsx
    │   ├── index.tsx
    │   ├── projects.tsx
    │   ├── issues.tsx
    │   ├── notifications.tsx
    │   └── more.tsx
    ├── projects/[projectId].tsx
    └── issues/
        ├── new.tsx
        ├── [issueRef].tsx
        └── [issueRef]/edit.tsx
```

Protected routes are UX/navigation gates only. Projects API authorization remains authoritative.

### AD-9 — TanStack Query for server state

Use TanStack Query for remote server state and cursor pagination. Do not add Redux by default.

Wire:

- `focusManager` to React Native `AppState`;
- `onlineManager` to Expo Network or the selected canonical connectivity source;
- organization ID into every organization-scoped query key;
- cache invalidation on organization switch/logout.

Do not fetch an entire organization dataset merely to filter it on-device when server filters exist.

### AD-10 — Native presentation, shared domain contracts

Do not import React DOM/shadcn UI primitives from `@876/ui` into React Native.

Create a deliberately small native presentation layer only after auditing whether any non-DOM design tokens/contracts can be reused safely. Reuse domain types/resources and visual semantics; do not pretend DOM components are portable.

### AD-11 — Continuous Native Generation first

Prefer Expo Continuous Native Generation and app/config plugins. Do not commit generated `android/` or `ios/` directories in the initial scaffold unless an actual native customization requires a deliberate bare/native ownership decision.

### AD-12 — Development build from day one

Use `expo-dev-client` and physical-device testing. The user develops through a remote Hetzner/vscode.dev environment, so Metro should support a tunnel-based development path while all business data still targets production.

## 7. Target v1 information architecture

Bottom-level navigation:

```text
Home | Projects | Issues | Notifications | More
```

### Home

Execution-focused summary:

- My Work;
- recent Issues;
- upcoming work/events where already supported by Projects contracts;
- recent activity.

### Projects

All Projects visible to the acting member, with server-side search/filter/pagination where supported.

Project detail v1:

- Overview;
- Issues;
- Activity;
- Files only when the Storage/native upload path is deliberately implemented and the storage rule has been read.

### Issues

Organization-wide Issue browser, not only assigned Issues.

Views/filters should reuse server capabilities:

- All;
- Mine;
- Open;
- Completed;
- search;
- Project;
- workflow state/status;
- priority;
- assignee;
- label;
- type/phase when the owning APIs support those filters without adding client-side approximation.

### Issue detail

Mobile-first working surface:

- title/reference;
- status/priority/assignee;
- description;
- Project/Phase/Task List/Cycle/type/dates where available;
- Comments;
- Activity.

### Comments

Comments are part of v1 and must support:

- complete Issue comment thread;
- author/timestamp;
- Markdown-compatible rendering consistent with existing data;
- create;
- edit;
- delete;
- permission-aware actions;
- optimistic UX only where rollback/error behavior is explicit;
- mentions backed by the organization roster, not global user search.

## 8. Phased implementation sequence

### Phase 0 — Reconnaissance and scaffold contract

**Goal:** prove current repo/API assumptions before changing code.

Tasks:

- [ ] Re-read all binding rules on the implementation branch.
- [ ] Inspect current Core OAuth client registration/authorization/token code and deployed issuer configuration.
- [ ] Inspect existing Couriers/Work bearer session guard implementations and identify the canonical code to reuse/promote.
- [ ] Inspect Projects API route/controller/service boundaries for Projects, Issues, Comments, Notifications, My Work.
- [ ] Inspect `@876/projects` transport/resource factories and current exports.
- [ ] Run `pnpm create expo-app` help/template inspection and confirm the current SDK 57 template before accepting generated versions.
- [ ] Record exact production Core/OAuth public origin.
- [ ] Record any premise that is false before proceeding.

**No implementation should proceed from an unverified premise.**

### Phase 1 — Native OAuth/application registration foundation

**Goal:** make Projects Mobile a legitimate first-party public OAuth client.

Tasks:

- [ ] Define/register the native Projects OAuth client using existing Core ownership.
- [ ] PKCE S256 required; no client secret.
- [ ] Define Android deep-link/application scheme and redirect URI.
- [ ] Confirm scopes, including `offline_access` if current Core policy permits rotating native sessions as planned.
- [ ] Add contract/security tests for public-client flow.
- [ ] Keep all security-critical decisions explicit in the plan/report.

### Phase 2 — Projects API session tier

**Goal:** signed-in humans can call Projects-owned capabilities without an internal key.

Tasks:

- [ ] Add/reuse canonical bearer/JWKS verification.
- [ ] Validate issuer, audience, expiry, `token_use`, subject, realm/app context.
- [ ] Resolve membership/app entitlement/app assignment/modules/effective permissions through the owning Core control-plane API/client.
- [ ] Expose session routes for the minimum v1 resources.
- [ ] Route session handlers into existing service functions.
- [ ] Cover tenant isolation and negative authorization paths.
- [ ] Prove internal/service/operator/integration contracts remain unchanged.

Minimum resource scope for this phase:

- Projects list/retrieve;
- Issues list/retrieve/create/update as needed by v1;
- Comments list/create/update/delete;
- Notifications list/read operations needed by v1;
- My Work/read models needed by Home if current APIs support them cleanly.

### Phase 3 — `@876/projects/session`

**Goal:** native-safe typed consumer entrypoint.

Tasks:

- [ ] Refactor credential/route selection out of domain resource behavior without duplicating resources.
- [ ] Add `@876/projects/session` package export.
- [ ] Session runtime accepts bearer access token and production base URL.
- [ ] Ensure no `server-only` import reaches the session graph.
- [ ] Preserve canonical `{ data, error }` handling and existing resource schemas.
- [ ] Add browser/native importability tests and header/route tests.

### Phase 4 — Expo app scaffold

**Goal:** production-grade native shell with no business feature implementation yet.

Tasks:

- [ ] Create `apps/projects-mobile` using the current SDK 57 template through pnpm/Expo tooling.
- [ ] Use Expo Router.
- [ ] Install `expo-dev-client`.
- [ ] Add CNG-compatible app configuration and Android identifiers/scheme.
- [ ] Add TypeScript/lint/test scripts consistent with monorepo conventions.
- [ ] Integrate Turbo only as needed by existing workspace conventions.
- [ ] Do not add manual Metro monorepo hacks by default.
- [ ] Run `expo-doctor` and diagnose any React 19.2.8 vs 19.2.3 resolution issue before changing shared dependency versions.

### Phase 5 — Native auth/session/workspace bootstrap

**Goal:** user can authenticate and enter an authorized Projects workspace.

Tasks:

- [ ] Implement AuthSession/WebBrowser PKCE flow.
- [ ] Store token material in SecureStore.
- [ ] Implement single-flight refresh with refresh-token rotation.
- [ ] Revoke/clear on logout.
- [ ] Use Account/Workspace session clients for self-access and organization selection.
- [ ] Resolve only organizations where Projects is actually available to the acting member.
- [ ] Protect authenticated route group using Expo Router protected routes.
- [ ] Clear org-scoped caches on org switch/logout.

Workspace behavior:

```text
0 valid Projects orgs -> No Access
1 valid Projects org  -> enter automatically
2+ valid Projects orgs -> chooser
```

### Phase 6 — Query/lifecycle foundation

**Goal:** scalable native server-state behavior before feature screens multiply.

Tasks:

- [ ] Add one app-level QueryClient.
- [ ] Define centralized query-key factories scoped by organization.
- [ ] Wire `focusManager` to AppState.
- [ ] Wire `onlineManager` to native connectivity.
- [ ] Define retry/error rules that do not loop on auth/permission errors.
- [ ] Define cursor/infinite-query helpers only when two or more real resources need the behavior or the repo already owns one.
- [ ] Keep mutations online-only in v1.

### Phase 7 — Projects and Issues

**Goal:** all authorized work is discoverable and actionable.

Tasks:

- [ ] Projects list/pagination/search.
- [ ] Project detail.
- [ ] Organization-wide Issues list.
- [ ] Mine/Open/Completed lenses as server filters, not duplicated endpoints.
- [ ] Issue search/filter/pagination.
- [ ] Issue detail.
- [ ] Issue create/edit where permissions permit.
- [ ] Pull-to-refresh and stable empty/loading/error states.

### Phase 8 — Comments

**Goal:** complete mobile Issue discussion workflow.

Tasks:

- [ ] Load all comments for Issue.
- [ ] Native comment composer.
- [ ] Create/edit/delete.
- [ ] Permission-aware action controls.
- [ ] Markdown rendering/editing consistent with stored comment contract.
- [ ] Organization-scoped mentions if current mention contract is suitable for native use.
- [ ] Optimistic mutation only with tested rollback/reconciliation.

### Phase 9 — Notifications and Home/My Work

**Goal:** make the app useful as a daily execution companion.

Tasks:

- [ ] Notification inbox and unread state.
- [ ] Mark/read behavior.
- [ ] Deep links into Projects/Issues where identifiers are available.
- [ ] Home/My Work derived from existing Projects read models.
- [ ] Do not invent duplicate aggregation endpoints if existing My Work/activity APIs own the capability.

Push notifications are deferred unless explicitly approved as a new phase.

### Phase 10 — Production hardening and physical-device release candidate

**Goal:** prove the native client is safe and operable against production.

Tasks:

- [ ] Static guard/test against accidental internal keys/client secrets/local Projects API values in mobile source/config.
- [ ] Validate deep-link/OAuth callback on a physical Android device.
- [ ] Validate token refresh after background/restore.
- [ ] Validate org switch cache isolation.
- [ ] Validate Projects/Issues/Comments against production.
- [ ] Add development/preview/production EAS profiles if EAS Build is adopted in this phase.
- [ ] Introduce `runtimeVersion` policy if/when EAS Update is enabled.
- [ ] Update `docs/876-projects-mobile.md` and master plan/report tables.

## 9. Branch and PR strategy

This is a multi-phase feature. `feature/projects-mobile` is the long-lived integration branch and is the only branch that should eventually open a PR to `main`.

After the user explicitly authorizes implementation, phase work should use focused branches targeting the integration branch, for example:

```text
main
└── feature/projects-mobile
    ├── feat/projects-mobile-oauth
    ├── feat/projects-mobile-session-api
    ├── feat/projects-mobile-session-sdk
    ├── feat/projects-mobile-scaffold
    ├── feat/projects-mobile-auth-shell
    ├── feat/projects-mobile-work
    ├── feat/projects-mobile-comments
    └── feat/projects-mobile-hardening
```

Do not open the final `main` PR until the whole feature is coherent and verified. Preserve phase history through merge commits per the repository git rule.

**Current authorization state:** only the integration branch and planning files are authorized in this setup pass. Do not start any implementation phase until the user explicitly says to proceed.

## 10. Muse/Codex execution model

The user wants the implementation driven locally by Muse Spark 1.3 Contributor through Codex.

The repo-configured invocation is:

```bash
codex exec -p muse --dangerously-bypass-approvals-and-sandbox \
  "$(cat plans/sep/16-projects-mobile/briefs/codex/<brief>.md)" < /dev/null
```

Do not also pass `-m`; `-p muse` selects the configured Muse provider/model.

For this run, Muse/Codex is the local implementation driver once the user authorizes coding. It must act as the primary local agent for work it authors rather than silently delegating security/session design to another unreviewed CLI. Security-critical OAuth/session/key-handling changes require explicit reasoning, negative tests, and primary-agent review before acceptance.

Detailed local operating procedure is in `./local-muse-codex-plan.md`.

## 11. Verification matrix

Exact scripts must be confirmed from each affected package before execution. Expected gates include:

```bash
pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api boundaries
pnpm --filter @876/api test

pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api boundaries
pnpm --filter @876/projects-api test

pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test

pnpm --filter @876/projects-mobile typecheck
pnpm --filter @876/projects-mobile lint
pnpm --filter @876/projects-mobile test
pnpm --filter @876/projects-mobile exec expo-doctor
```

Also run applicable root checks for package-boundary/structure/formatting rules. Never claim a command passed unless it was actually executed.

Physical-device acceptance is mandatory before declaring the mobile feature complete.

## 12. Security acceptance criteria

Before final integration:

- [ ] no confidential credential exists in native source/config/generated bundle inputs;
- [ ] OAuth native client uses PKCE and no client secret;
- [ ] refresh-token rotation is persisted atomically;
- [ ] invalid/expired/wrong-purpose/wrong-audience bearer tokens fail closed;
- [ ] cross-organization access is denied server-side;
- [ ] removed/revoked app access stops working without requiring a new app build;
- [ ] module and permission checks are not inferred from navigation;
- [ ] comment/Issue mutations derive actor from authenticated principal;
- [ ] logout removes local token material and org-scoped cached data;
- [ ] internal Projects routes continue requiring server credentials.

## 13. Scalability acceptance criteria

- [ ] mobile app reuses bounded packages rather than raw-fetching product APIs throughout screens;
- [ ] domain resources are implemented once;
- [ ] all unbounded lists paginate;
- [ ] query keys include organization identity;
- [ ] organization switch cannot display prior-org data;
- [ ] no unnecessary Redux/global store duplicates TanStack Query server state;
- [ ] no hand-maintained Metro monorepo config exists without a documented reason;
- [ ] native presentation primitives stay small and app-owned until genuine cross-native reuse exists;
- [ ] generated native directories are not committed merely because Expo can generate them;
- [ ] SDK/package version changes are made using Expo-compatible tooling rather than guessed semver.

## 14. Risk register

### R1 — React patch-version mismatch

Root React is `19.2.8`; Expo SDK 57 documents `19.2.3`. Risk: duplicate React/resolution problems if shared packages or Metro resolve inconsistent copies.

Mitigation: use Expo-managed app versions, run Expo Doctor, inspect actual resolution, and only then make the narrowest workspace change. Do not globally downgrade on assumption.

### R2 — Existing Core OAuth was historically described as dormant

The OAuth implementation exists, but its current production client-registration/first-party-native policy must be verified before treating it as ready for a shipping mobile client.

Mitigation: Phase 0 inspects deployed/current code and configuration before any native auth implementation.

### R3 — Projects API currently trusts internal authority

Adding session authority is security-sensitive and can accidentally broaden access.

Mitigation: separate principal routes/guards, same business implementation, exhaustive negative authorization tests, no internal-route weakening.

### R4 — Production-only data during development

Every development mutation can affect real customer/project data.

Mitigation: clear UI/account labeling during development, use dedicated test organization/data in production, and never add a hidden non-production endpoint as a shortcut.

### R5 — Remote development networking

Metro runs remotely on Hetzner while the phone is elsewhere.

Mitigation: development-build + tunnel workflow; Projects/Core traffic remains direct HTTPS from device to production and is independent of Metro transport.

## 15. Dispatched briefs

No implementation briefs have been dispatched yet.

| Brief | Tool | Status |
| --- | --- | --- |
| None | — | Planning only |

Future briefs belong under `./briefs/codex/` and must be linked here before execution.

## 16. Execution reports

No implementation reports exist yet.

| Report | Tool | Status |
| --- | --- | --- |
| None | — | Implementation not started |

## 17. Live task checklist

### Planning foundation

- [x] Read `CLAUDE.md`.
- [x] Read GPT web operating rules.
- [x] Read CLI/implementation-tracker and relevant architecture rules available to this planning pass.
- [x] Cut `feature/projects-mobile` from current `main`.
- [x] Verify current official Expo/React Native setup guidance.
- [x] Record repository/Expo React-version mismatch risk.
- [x] Create master plan.
- [x] Create GPT-web/orchestrator plan.
- [x] Create local Muse/Codex administration plan.
- [ ] Start implementation — **intentionally not authorized in this pass**.

## 18. Handoff state

At the end of this setup pass:

- integration branch exists;
- architecture/research baseline is recorded;
- no Expo app has been scaffolded;
- no dependencies have been added;
- no API/SDK code has been modified;
- no database schema/migration has been created;
- no OAuth client has been registered;
- no implementation phase branch has been created;
- implementation should begin with **Phase 0 reconnaissance only after explicit user authorization**.

The local driver should read this file, then `local-muse-codex-plan.md`, re-read the binding repository rules from the current branch, and verify that the integration branch has not drifted from this handoff before beginning.

## 19. PR preparation summary

Not applicable yet. Planning-only foundation; implementation is intentionally unstarted.
