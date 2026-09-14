# Tracker: Application Module Runtime Convergence

- Branch: `feature/app-module-runtime-convergence`
- Base: `main` @ `65d3f77500061fd3efeb40a175c13ae5fe9e0af6`
- Status: `IN_PROGRESS`

| Phase | Status | Notes |
| --- | --- | --- |
| 0. Rules, branch, inventory | DONE | Read root CLAUDE.md, GPT-Web rules, code quality, naming, types, style, testing, error handling, git, access control, module settings, feature flags, navigation performance, API backend, SDK, data fetching, app structure, product lineup, implementation tracker. |
| 1. Canonical module registries | TODO | Add Projects + Commerce identities and commercial-key declarations. |
| 2. Permission catalog alignment | TODO | Reuse canonical identities where semantics match; keep finer permission domains independent. |
| 3. Commercial materialization | TODO | Generalize plan seed; materialize Projects only when enforceable; keep Commerce projection empty for now. |
| 4. Shared runtime access | TODO | Add modules to AccessContext and navigation requirements/resolution with tests. |
| 5. Projects adoption | TODO | Replace local identity duplication; module-aware nav/runtime gating. |
| 6. Commerce adoption | TODO | Add app-membership/effective permission/module resolution; no commerce domain implementation. |
| 7. Console review | TODO | Confirm registry-managed display and plan composer remain materialized-module driven. |
| 8. Adversarial review | TODO | Check auth widening, duplicate ownership, commercial overreach, compatibility residue. |
| 9. Final report | TODO | Count added `it()` cases, changed files, risks, verification commands; mark verification not executed. |

## Live decisions

- Projects canonical modules: `projects`, `issues`, `reports`.
- Projects `dashboard`, `comments`, `labels`, `members`, `settings` remain permission/navigation domains.
- Commerce canonical registry declares the long-term capability vocabulary but does not make those capabilities sellable by declaration alone.
- Commerce commercial module keys start empty unless current runtime support proves otherwise.
- No feature flag is added merely to represent module state.
- Navigation gating is not an authorization boundary.

## Verification status

Not executed; verification is the orchestrator's.