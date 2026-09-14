# Tracker: Application Module Runtime Convergence

- Branch: `feature/app-module-runtime-convergence`
- Base: `main` @ `65d3f77500061fd3efeb40a175c13ae5fe9e0af6`
- Status: `IN_PROGRESS`

| Phase | Status | Notes |
| --- | --- | --- |
| 0. Rules, branch, inventory | DONE | Read root CLAUDE.md, GPT-Web rules, code quality, naming, types, style, testing, error handling, git, access control, module settings, feature flags, navigation performance, API backend, SDK, data fetching, app structure, product lineup, implementation tracker, and execution autonomy. |
| 1. Canonical module registries | DONE | Added Projects and Commerce canonical registries. Projects declares `projects`, `issues`, `reports`; Commerce declares the long-term Shopify-class capability vocabulary. |
| 2. Permission catalog alignment | DONE | Projects reuses canonical identity only where semantics match. Commerce has a full app-access permission catalog while finer permission domains remain independent from commercial modules. |
| 3. Commercial materialization | DONE | Generalized registry-backed seed behavior. Projects materializes `projects` + `issues` and grants them to `876-projects-free`; `reports` stays non-commercial while unavailable. Commerce commercial keys remain empty. |
| 4. Shared runtime access | DONE | `AccessContext` carries module availability, `hasModule()` exists, and navigation can AND module + permission + feature requirements. Self app-membership now returns `entitled_modules`. |
| 5. Projects adoption | DONE | Split legacy UI-surface availability from canonical product modules; Projects app bootstrap, navigation, project/issue pages, create pages, Board, and create API proxies enforce module + permission. Removed copied CRM feature-key names. |
| 6. Commerce adoption | DONE | Added account-session bootstrap against the canonical self app-membership read. Commerce now resolves effective permissions/modules from Core and fails closed when assignment access is empty. No domain surfaces were invented. |
| 7. Console review | DONE | Commercial table remains materialized-module driven. Added read-only `Declared capabilities` projection so registry-owned but non-commercial Commerce capabilities are visible without becoming plan options. |
| 8. Adversarial review | IN_PROGRESS | Found one real migration risk: existing organization-scoped system-role copies are intentionally preserved, so new Commerce permission keys can be absent from already-materialized org roles. Implement safe system-role permission synchronization/backfill and audit bypass/test drift. |
| 9. Final report | TODO | Count added `it()` cases, changed files, risks, verification commands, and record connector-only verification limits. |

## Live decisions

- Code owns stable first-party module/capability identity; the database owns commercial materialization, plan composition, entitlement state, rollout linkage, and tenant/runtime state.
- Projects canonical modules: `projects`, `issues`, `reports`.
- Projects `dashboard`, `comments`, `labels`, `members`, `settings` remain permission/navigation domains.
- Projects `reports` is canonical but not commercial until its surface/runtime is available.
- Commerce canonical registry declares the long-term capability vocabulary but does not make those capabilities sellable by declaration alone.
- Commerce commercial module keys remain empty until a capability has concrete runtime entitlement semantics.
- No feature flag is added merely to represent module state.
- Module + permission + feature requirements are independent layers and combine with AND semantics when jointly declared.
- Navigation gating is presentation only; page/API boundaries must repeat authorization/module enforcement.
- Product apps consume self app-membership access state; they do not call Console/admin module APIs.
- Registry-managed capabilities absent from `application_modules` may be shown in Console as read-only declared capabilities, but only materialized rows are plan-selectable.

## Open adversarial item

Platform app-access seeds update platform role templates, while `materializeRoleTemplatesForApp()` preserves an existing organization-scoped role exactly. That preservation is correct for mutable presentation fields and custom roles, but it leaves platform-managed system-role permission copies stale when the canonical system template gains permissions. The fix must synchronize only immutable/system-owned permission membership for live system copies tied to a template; it must not overwrite custom roles or organization-owned presentation metadata.

## Verification status

Repository execution has not been performed in this GPT-Web run. Connector review and source-level tests are being added, but no local typecheck, lint, build, Vitest, Prisma validation, or migration command is being claimed as executed.