# Local Administration Plan: Muse via Codex — 876 Projects Mobile

- **Run ID:** `2026-09-16-projects-mobile`
- **Integration branch:** `feature/projects-mobile`
- **Local driver:** Muse Spark 1.3 Contributor through Codex profile `muse`
- **Status:** `IN_PROGRESS` — ready for local reconnaissance after user authorizes implementation
- **Master plan:** `./plan.md`
- **Remote/orchestrator plan:** `./orchestrator-plan.md`

## 1. Purpose

This file is the durable handoff for the local AI that will drive implementation from `/root/projects/876`.

The user explicitly wants the implementation driven locally with Muse through Codex. For this run, the Muse/Codex process is therefore the primary local implementation driver once the user says to begin. It should not treat itself as a disposable code generator: it owns repository inspection, phase execution, verification, plan updates, focused commits, and handoff reporting for the work it performs.

**Do not start implementation merely because this file exists.** The current setup pass authorized planning only. Wait until the user explicitly authorizes implementation.

## 2. Required local bootstrap

When implementation is authorized, start from the repository root:

```bash
cd /root/projects/876

git fetch origin
git checkout feature/projects-mobile
git pull --ff-only origin feature/projects-mobile
```

Before editing anything, confirm:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
```

Expected integration branch:

```text
feature/projects-mobile
```

Do not assume the branch head still matches this planning handoff; inspect any newer commits first.

## 3. Read these files before implementation

Read `CLAUDE.md` fully, then the Codex/non-Claude rules mirror under `.agents/rules/`.

Minimum set for the first implementation phases:

```text
CLAUDE.md
.agents/rules/cli.md
.agents/rules/implementation-tracker.md
.agents/rules/ai-code-quality.md
.agents/rules/naming.md
.agents/rules/types.md
.agents/rules/code-style.md
.agents/rules/testing.md
.agents/rules/error-handling.md
.agents/rules/git.md
.agents/rules/api-backend.md
.agents/rules/express-api.md
.agents/rules/stripe-api-pattern.md
.agents/rules/sdk-conventions.md
.agents/rules/access-tiers.md
.agents/rules/access-control.md
.agents/rules/app-access.md
.agents/rules/platform-services.md
.agents/rules/deployment.md
```

Then read:

```text
plans/sep/16-projects-mobile/plan.md
plans/sep/16-projects-mobile/orchestrator-plan.md
plans/sep/16-projects-mobile/local-muse-codex-plan.md
```

When a phase touches files/attachments, add:

```text
.agents/rules/storage-architecture.md
```

When a phase creates shared cross-host UI abstractions, add:

```text
.agents/rules/shared-product-ui.md
```

Do not read rules as ceremony and then ignore them. If a local implementation choice conflicts with a binding rule, the rule wins unless the user explicitly changes the architecture.

## 4. Muse invocation

The repository already defines the Muse provider profile for Codex.

Probe when needed:

```bash
codex exec -p muse --dangerously-bypass-approvals-and-sandbox \
  "Reply with exactly OK" < /dev/null
```

For a phase brief:

```bash
codex exec -p muse --dangerously-bypass-approvals-and-sandbox \
  "$(cat plans/sep/16-projects-mobile/briefs/codex/<brief>.md)" < /dev/null
```

Rules:

- use `-p muse`;
- do **not** also pass `-m` because that overrides the Muse profile;
- exit code `0` does not prove work succeeded;
- always inspect `git status`, `git diff`, changed files, and any report;
- never add AI attribution to commit messages, PR bodies, or trailers.

If Muse itself is running as the primary local driver, it does not need to recursively launch another Muse process for every step. The important requirement is that the work is driven under the Muse/Codex profile and follows the repository's local rules. Use phase briefs to preserve scope and continuity, not to create unnecessary nested agents.

## 5. Phase-branch policy

`feature/projects-mobile` is the integration branch, not the long-term scratch branch for every implementation edit.

After the user authorizes implementation, follow the multi-phase git strategy from `.agents/rules/git.md`.

Suggested phase branches:

```text
feat/projects-mobile-oauth
feat/projects-mobile-session-api
feat/projects-mobile-session-sdk
feat/projects-mobile-scaffold
feat/projects-mobile-auth-shell
feat/projects-mobile-work
feat/projects-mobile-comments
feat/projects-mobile-hardening
```

Each phase branch should target `feature/projects-mobile`, not `main`.

Do not create those branches until implementation is authorized. The current branch authorization in this planning pass covered only `feature/projects-mobile`.

Before creating a phase branch:

```bash
git checkout feature/projects-mobile
git pull --ff-only origin feature/projects-mobile
git status --short
```

Create the phase branch from the updated integration branch.

Do not merge the integration branch to `main` until all required phases are complete and the user approves the final integration.

## 6. Phase 0 must happen before code

The first authorized local phase is reconnaissance, not scaffolding.

Do not begin by running `create-expo-app` and then trying to force the repository to fit it.

### 6.1 Verify Core OAuth

Locate and document:

- OAuth client model/registry;
- authorization route;
- token exchange route;
- refresh-token rotation behavior;
- PKCE validation;
- public-client/client-secret behavior;
- native redirect URI validation rules;
- discovery issuer;
- JWKS endpoint;
- access-token claims (`sub`, `aud`, `token_use`, `realm`, `org_id`, etc.);
- production Core/OAuth origin;
- existing tests that define these contracts.

Do not assume historical docs are current.

### 6.2 Verify bearer-session guard ownership

Inspect at least:

- Couriers API session guard/JWT verifier;
- Work API session authorization where relevant;
- any shared Core/platform JWT helpers.

Answer:

1. Is there already one canonical reusable verifier?
2. If two services have copies, where should the reusable behavior live?
3. What exact configuration does Projects API need?
4. What must remain service-specific after JWT verification?

Do not write a third independent JWT verifier without proving reuse is inappropriate.

### 6.3 Verify Projects service ownership

For Projects, Issues, Comments, Notifications, and My Work, locate:

- route modules;
- controllers;
- service functions;
- authorization assumptions;
- serializers/schemas;
- existing internal/operator/integration callers;
- tests.

The purpose is to route session authority to existing capabilities, not reimplement them.

### 6.4 Verify Projects SDK graph

Inspect:

```text
packages/projects/package.json
packages/projects/src/client.ts
packages/projects/src/runtime.ts
packages/projects/src/request.ts
packages/projects/src/resources/*
packages/projects/src/service-client.ts
packages/projects/src/operator.ts
packages/projects/src/integration.ts
```

Determine exactly where `server-only` enters the graph and the smallest refactor that allows a native-safe `@876/projects/session` entrypoint without duplicating resources.

### 6.5 Verify Expo template before accepting dependency versions

Use current Expo tooling, not guessed versions from the plan prose.

The researched baseline on 2026-09-16 is SDK 57 / React Native 0.86 / React 19.2.3, but the local driver must confirm the template actually produced by current Expo tooling.

The repo root currently pins React 19.2.8.

**Do not change root React during reconnaissance.**

Record the likely conflict and wait for the scaffold/doctor evidence before modifying shared dependency policy.

## 7. Durable Phase 0 output

Before coding Phase 1, update the master plan with a reconnaissance section or report that answers each question above with file paths and exact findings.

Recommended report:

```text
plans/sep/16-projects-mobile/reports/codex/2026-09-16-reconnaissance.md
```

The report should include:

- verified premises;
- disproved premises;
- exact Core production OAuth origin;
- exact Projects production origin;
- canonical JWT/session owner;
- Projects service functions to reuse;
- SDK refactor seam;
- Expo template/package versions observed;
- risks/blockers;
- verification commands run;
- commands not run.

If a master-plan premise is wrong, update `plan.md` before writing implementation code.

## 8. Expo scaffold rules for the later scaffold phase

When the scaffold phase is authorized, use the repository package manager and current Expo tooling.

Conceptual creation command:

```bash
pnpm create expo-app apps/projects-mobile
```

Select/ensure the current SDK 57-compatible default template at execution time.

Do not hand-author package versions from memory if Expo tooling can select compatible versions.

### Monorepo defaults

The repository already has:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Therefore the new app is automatically in the workspace.

Use Expo's monorepo-aware Metro defaults. Do not add these legacy settings unless a measured issue requires them:

```text
watchFolders
resolver.nodeModulesPath
resolver.extraNodeModules
resolver.disableHierarchicalLookup
```

If custom Metro config becomes necessary, document the exact failure it fixes and add a regression/verification step.

### React-version mismatch

The root is currently React 19.2.8 while Expo SDK 57 documents 19.2.3.

Required order:

1. generate scaffold with Expo-compatible versions;
2. run root `pnpm install`;
3. inspect resolved React versions;
4. run Expo Doctor;
5. start Metro;
6. launch development build;
7. only then consider a workspace-level version policy change.

Never downgrade all Next.js apps merely to silence an unverified Expo warning.

## 9. Development-build policy

Use `expo-dev-client` from the start.

The goal is a production app, not an Expo Go demo.

The remote development topology is:

```text
Hetzner/vscode.dev
  -> Metro/Expo tunnel
  -> physical Android development build
  -> production Core/Projects APIs over HTTPS
```

Metro transport and business API transport are separate concerns.

The fact that Metro is remote must never cause the app to proxy production Projects traffic through the development server.

## 10. Native auth implementation rules

When the auth phase is authorized:

- use the existing 876 OAuth provider;
- public client only;
- Authorization Code + S256 PKCE;
- use system browser/AuthSession flow;
- no client secret;
- store access/refresh token material in SecureStore;
- validate OAuth `state`;
- persist refresh-token rotation atomically;
- one refresh coordinator/single flight;
- retry an authenticated request at most once after successful refresh;
- on refresh failure, clear session and protected app state;
- revoke tokens on logout where Core supports it;
- never persist bearer/refresh tokens in AsyncStorage.

Security-critical implementation deserves direct primary-agent reasoning and review. Do not hand it off to another unreviewed cheap CLI merely because the rest of this project is being driven by Muse.

## 11. Projects API session-tier implementation rules

Do not replace or relax existing internal routes.

The session tier must be explicit.

Required identity/auth checks:

```text
valid signature
correct issuer
correct audience
not expired
correct token_use
valid subject
supported realm/app context
```

Required Projects access checks:

```text
active org membership
active/trialing app entitlement
active non-revoked app assignment
required entitled module when module-backed
concrete effective app permission
```

Permissions/modules remain separate planes.

The API derives the actor from validated credentials. Ignore/reject any client field that tries to choose another actor.

### Minimum negative tests

Add meaningful coverage for:

- missing bearer;
- malformed bearer;
- invalid signature;
- expired token;
- wrong issuer;
- wrong audience;
- wrong `token_use`;
- missing subject;
- inactive membership;
- missing app entitlement;
- revoked/missing assignment;
- missing module entitlement;
- missing resource permission;
- cross-organization access;
- actor spoof attempt;
- valid read;
- valid write;
- internal route still rejects session-only authority where appropriate.

Use assembled Express/Supertest HTTP tests for route/auth behavior per repository rules.

## 12. `@876/projects/session` rules

Add caller authority through the package export, not through a hidden flag at call sites.

Target import:

```ts
import { create876ProjectsSessionClient } from '@876/projects/session'
```

The client should own:

- bearer credential headers;
- session route shape;
- standard Projects result/error parsing;
- request ID support;
- native-safe dependency graph.

It should **not** duplicate:

- Issue schemas;
- Comment schemas;
- Project schemas;
- resource URL/query builders unless authority requires a genuinely different route prefix;
- business behavior.

Write a test that imports the session entrypoint without a `server-only` resolution failure.

## 13. Native state/data rules

Use TanStack Query for server-owned state.

Do not add Redux merely because the app is React Native.

Use local React/provider state only for small client-owned concerns such as:

- hydrated auth/token state;
- active organization selection;
- transient UI state.

### Query key invariant

Every organization-scoped key must structurally include the organization ID.

Example shape:

```text
['projects', organizationId, ...]
['issues', organizationId, filters]
['comments', organizationId, issueRef]
```

Do not rely only on clearing the cache correctly. The keys themselves should make cross-org collision impossible.

### React Native lifecycle

Wire TanStack Query:

- `focusManager` -> React Native `AppState` active state;
- `onlineManager` -> selected native connectivity source.

Keep default online-only mutation behavior for v1.

## 14. Production-only API policy

Projects runtime origin is intentionally fixed to production:

```text
https://876-projects-api.vercel.app
```

Do not add a runtime selector.

Do not add:

```text
EXPO_PUBLIC_PROJECTS_API_URL
localhost
127.0.0.1
LAN API discovery
staging Projects selector
```

Unit tests may inject fetch/transport and may use fake URLs inside clearly isolated test fixtures.

The local driver must determine the current production Core/OAuth public origin from repository/deployment truth during Phase 0 before pinning it.

## 15. UI implementation order

Do not build many polished screens before auth/query/API contracts are stable.

Recommended order:

1. app shell/protected routes;
2. workspace bootstrap;
3. Home skeleton/functional summary;
4. all Projects list;
5. Project detail;
6. all Issues list;
7. Issue detail;
8. Issue create/edit;
9. Comments thread/composer/edit/delete;
10. Notifications;
11. error/empty/loading polish;
12. physical-device hardening.

Use React Native/Expo components. Do not import DOM-only shadcn components from `@876/ui`.

## 16. Test/verification discipline

Run one heavy verification command at a time on the 7 GB host.

Expected affected-workspace gates include:

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

Confirm actual package scripts before running them.

Do not report green if a command was not executed.

If a command fails because of pre-existing unrelated repository state, record exact evidence and do not silently weaken checks.

## 17. Commit discipline

Follow `.agents/rules/git.md`.

- Conventional Commits;
- focused logical commits;
- no AI attribution;
- docs separate from code where practical;
- no `wip`, `cleanup`, or generic commit subjects;
- inspect every staged diff before commit.

Because the user has **not yet authorized implementation**, do not create implementation commits from this handoff alone.

When implementation begins, commit only after the user's authorization covers the phase/work and repository rules permit it.

## 18. Plan/tracker maintenance

The local driver must treat `plan.md` as live state.

After each phase:

1. update checklist items;
2. update decision log/risks if facts changed;
3. add brief link;
4. add report link;
5. record commit SHA(s);
6. record verification commands and results;
7. write exact next step/handoff state.

Never leave the master plan claiming a phase is pending after it merged.

Recommended report locations:

```text
plans/sep/16-projects-mobile/reports/codex/
plans/sep/16-projects-mobile/reports/orchestrator/
```

Do not create `.log` transcripts.

## 19. Physical Android acceptance

Before declaring v1 complete, install/use a development or preview build on the user's actual Android phone.

Required smoke path:

1. launch Projects Mobile;
2. authenticate with 876;
3. restore an existing session after relaunch;
4. select/switch Projects organization;
5. load all Projects;
6. open Project;
7. load all Issues;
8. filter/search Issues;
9. open Issue;
10. create/edit Issue where permitted;
11. read full Comments thread;
12. create Comment;
13. edit Comment;
14. delete Comment;
15. background/foreground and verify refresh behavior;
16. expire/refresh token path where safely testable;
17. revoke/remove access and verify server denial;
18. logout and confirm local secure/cache state is gone.

Use dedicated safe production test organization/data because this app intentionally points to production APIs during development.

## 20. Stop conditions

Stop the current phase and update/report instead of inventing a workaround when:

- the plan premise is false;
- Core OAuth cannot safely support a public native client without a larger design change;
- production Core/OAuth origin cannot be established;
- the required authorization data cannot be resolved without violating service ownership;
- Expo's generated version graph conflicts with the monorepo in a way that would require a broad Next.js dependency migration;
- the proposed SDK refactor would break existing authority entrypoints without an intentional compatibility plan;
- tests demonstrate cross-org/auth isolation is uncertain.

A blocked phase with evidence is preferable to a locally plausible security shortcut.

## 21. First local prompt after user authorizes implementation

Use this as the starting instruction to the local Muse/Codex driver:

```text
Read CLAUDE.md and all rules named in
plans/sep/16-projects-mobile/local-muse-codex-plan.md.
Then read plan.md, orchestrator-plan.md, and local-muse-codex-plan.md fully.

You are driving 876 Projects Mobile locally on feature/projects-mobile.
Do not scaffold or implement yet. Execute Phase 0 reconnaissance from the
master plan first. Verify every premise with exact file paths and contracts,
record the current production Core/OAuth origin, identify the canonical bearer
JWT/session guard owner, map the existing Projects service methods that session
routes should reuse, inspect the @876/projects transport graph, and inspect the
current Expo SDK 57 template/version output without changing shared dependency
policy. Write the reconnaissance report and update plan.md with any corrected
assumptions. Do not begin Phase 1 until Phase 0 evidence is complete.
```

That first run remains read-heavy by design. It prevents the new mobile host from baking in avoidable auth, package-resolution, or API-boundary mistakes.

## 22. Current handoff state

As of this planning handoff:

- `feature/projects-mobile` exists;
- planning documents are committed there;
- implementation is not started;
- no Expo dependencies or app files exist;
- no API/SDK/auth code has changed;
- the next action after user approval is Phase 0 reconnaissance, not code.
