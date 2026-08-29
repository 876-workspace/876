# Console Access Control — Phase 2 Completion Report

**Branch:** `feat/console-access-control`
**Date:** 2026-08-29
**Delegate:** ChatGPT web
**Verification owner:** Claude Code / orchestrator

## 1. Summary

This pass extends the Console access-control standard through route enforcement, API guard coverage, Team identity enrichment, and affiliation policy enforcement.

The branch now binds permission-gated sidebar entries to the same durable permission keys used by their nearest route layouts; adds blocking guards to the missing Console subtrees; adds a filesystem guard sweep for non-public route handlers and pages; authenticates audit-event writes and attributes them to the signed operator; resolves Team staff positions from one operator-tier employee-directory batch while preserving unresolved grants and degrading enrichment outages inline; and enforces the rule that only `staff` grants may hold `owner` or `super_admin`.

The platform-wide access-control rule now records the Console affiliation model and is mirrored into the `.agents` and `.grok` rule trees. A concurrent, unrelated billing-customer fix landed while this pass was in progress and was preserved by fast-forwarding all later work on top of it rather than rewriting the branch.

Phase E was deliberately skipped after checking the live platform provider contract: `apps/api/src/providers/posthog/flags.ts` exposes `Promise<Map<string, boolean>>` and collapses every PostHog value with `value !== false`, so multivariate variant strings are discarded before Console can consume them. Implementing the brief literally would require an API/provider contract change outside the asserted premise, or an impermissible direct PostHog path from Console.

Phase F is partial. The stabilized rule mirrors are present, but the requested root `CLAUDE.md` insertion is not: the available GitHub write interface replaces complete file contents rather than applying a surgical patch, and the brief explicitly says not to reconstruct that file by hand when a safe partial edit is unavailable.

## 2. Per-phase status

| Phase | Status | Files touched | New `it()` cases written in this pass |
| --- | --- | ---: | ---: |
| A — route binding | complete | 18 | 32 |
| B — guard sweep | complete | 3 | 13 |
| C — staff position | complete | 3 | 15 |
| D — affiliation | complete | 6 | 26 |
| E — experiments | skipped | 0 | 0 |
| F — docs | partial | 2 rule mirrors | 0 |

The counts above are the cases added by this Phase 2 pass, not the size of pre-existing suites. No test, typecheck, lint, build, or other verification command was executed here.

## 3. Every file changed

### Phase A — route enforcement and binding

- `apps/console/src/app/(app)/apps/layout.tsx` — binds the Apps subtree guard to the canonical route-permission map.
- `apps/console/src/app/(app)/features/layout.tsx` — binds the Features subtree guard to the canonical route-permission map.
- `apps/console/src/app/(app)/orgs/layout.tsx` — binds the Organizations subtree guard to the canonical route-permission map.
- `apps/console/src/app/(app)/reports/layout.tsx` — adds a blocking Reports permission layout.
- `apps/console/src/app/(app)/security/layout.tsx` — adds a blocking Security permission layout.
- `apps/console/src/app/(app)/settings/layout.tsx` — binds Settings to its canonical route permission.
- `apps/console/src/app/(app)/settings/security/layout.tsx` — adds the nested Settings Security guard.
- `apps/console/src/app/(app)/settings/users/layout.tsx` — adds Team/Settings Users route authorization without removing its existing UI structure.
- `apps/console/src/app/(app)/settings/users/roles/layout.tsx` — adds the nested Roles guard.
- `apps/console/src/app/(app)/storage/layout.tsx` — adds a blocking Storage permission layout.
- `apps/console/src/app/(app)/support/layout.tsx` — adds a blocking Support permission layout.
- `apps/console/src/app/(app)/users/layout.tsx` — binds Users to its canonical route permission.
- `apps/console/src/app/(app)/widgets/layout.tsx` — binds Widgets to its canonical route permission.
- `apps/console/src/components/shell/nav-config.ts` — aligns sidebar visibility with the same stronger permission keys enforced by routes.
- `apps/console/src/components/shell/nav-config.test.ts` — covers exact visible href sets and system-role ownership of navigation requirements.
- `apps/console/src/lib/auth/route-layouts.test.tsx` — covers allow/deny behavior for newly guarded subtrees.
- `apps/console/src/lib/auth/route-permissions.test.ts` — adds registry/filesystem anti-drift checks for route permissions and guard presence.
- `apps/console/src/lib/auth/route-permissions.ts` — defines the canonical Console route-to-permission map.

### Phase B — API/page guard sweep

- `apps/console/src/app/api/audit-events/route.test.ts` — covers session-required audit writes, stable envelopes, attribution, and exact call behavior.
- `apps/console/src/app/api/audit-events/route.ts` — requires a signed Console session and ignores forged body attribution.
- `apps/console/src/lib/auth/guard-coverage.test.ts` — sweeps route handlers and public pages so new unguarded surfaces fail coverage.

### Phase C — Team staff position enrichment

- `apps/console/src/app/(app)/settings/users/(list)/page.tsx` — consumes the batched Team loader and shows a non-blocking staff-position outage notice.
- `apps/console/src/lib/access/team-list-data.test.ts` — covers one-batch employee/identity loading, map joins, affiliation-specific position rules, and failure degradation.
- `apps/console/src/lib/access/team-list-data.ts` — loads grants, identities, and staff employee profiles without per-row requests and preserves unresolved grants.

### Phase D — affiliation policy and role cap

- `.claude/rules/access-control.md` — documents the Console grant-only affiliation policy, staff employment verification direction, expiry rules, and role cap.
- `apps/console/src/lib/auth/guards.test.ts` — adds the full staff-employment and contractor/external expiry guard matrix with fake-clock boundary coverage.
- `apps/console/src/lib/service/team/create.ts` — validates create grants against the requested role.
- `apps/console/src/lib/service/team/role-cap.test.ts` — covers create/update affiliation-role combinations including affiliation transitions.
- `apps/console/src/lib/service/team/update.ts` — validates the complete resulting affiliation/role combination before update.
- `apps/console/src/lib/service/team/validation.ts` — adds `team/role-not-allowed-for-affiliation` and caps non-staff grants at `admin`.

### Phase F — rule mirrors and report

- `.agents/rules/access-control.md` — mirrors the stabilized shared access-control rule for non-Claude agents.
- `.grok/rules/access-control.md` — mirrors the stabilized shared access-control rule for Grok.
- `.claude/reports/gpt-web/2026-08-29-console-access-control-phase-2.md` — records this pass, its test counts, deliberate gaps, risks, and required verification.

`CLAUDE.md` was intentionally not changed; see §§5 and 7.

## 4. Migration

None. This Phase 2 pass adds no schema migration and no SQL.

## 5. Decisions the brief did not settle

1. **The experiment premise is false on the live branch.** The brief says the platform already returns multivariate assignments, but `apps/api/src/providers/posthog/flags.ts` currently returns `Map<string, boolean>` and converts every defined provider value to `value !== false`. I stopped Phase E rather than inventing variant strings, bypassing the platform, or widening the API/provider contract under a false premise.
2. **The current employee facade name differs from the prose premise.** The actual Console surface exposes `$876.employees.admin.list(organizationId)`, so Phase C uses that existing operator-tier verb rather than inventing a stale `$876.orgs...` path.
3. **The rule mirrors need no textual path rewrite today.** The canonical access-control rule references companion rules by same-directory names such as `access-tiers.md` rather than `.claude/rules/...`; copying it into `.agents/rules/` and `.grok/rules/` therefore preserves correct relative resolution without changing those strings.
4. **Concurrent branch work was preserved.** When another agent advanced the branch, I did not force, merge, or rewrite history; subsequent commits were created from the new live HEAD and fast-forwarded only.
5. **The root rule pointer was not reconstructed.** The available GitHub file writer replaces the whole file. Because F.1 expressly requires a surgical insertion and says to leave it when safe partial editing is unavailable, I left `CLAUDE.md` untouched for the orchestrator.

## 6. Things you could not verify

Nothing in this pass was executed. In particular, do **not** assume:

- TypeScript compiles across `@876/core` or `@876/console`.
- Vitest cases pass or that module/fake-timer isolation behaves exactly as intended.
- ESLint accepts every touched file.
- Filesystem guard-sweep tests match every route introduced by concurrent work after this report was written.
- Next.js server-layout behavior or redirects have been exercised in a running application.
- `$876.employees.admin.list(organizationId)` returns production data with the exact availability assumed by the Team enrichment path.
- Sentry capture behavior was observed at runtime.
- Any database state, migration, seed, Cloudflare deployment, or production configuration was inspected or changed.

Verification is the orchestrator's responsibility.

## 7. Gaps deliberately left

1. **Phase E — PostHog experiments:** skipped in full because the platform currently discards variant strings and exposes only boolean decisions. Closing it correctly requires first changing the owning platform contract so variants survive provider evaluation and are returned through the approved `$876.features` path. No direct PostHog call was added to Console.
2. **Phase F.1 — root `CLAUDE.md` pointer:** left for the orchestrator. The requested insertion is known exactly, but this environment does not expose a safe partial-file write primitive and the brief forbids reconstructing the file by hand.

No other Phase 2 gap is intentionally claimed as complete.

## 8. Risk notes

- `validateTeamGrant` now requires `roleName`; `create` and `update` were changed with it, but repository typecheck must detect any call site not visible through the inspected Console service surface.
- `guards.test.ts` now freezes time and restores it after each case. The orchestrator should pay particular attention to interaction between fake timers, module-scoped `React.cache`, and existing guard tests.
- The staff-employment provider check deliberately fails open only for infrastructure/provider errors. Explicit inactive or missing membership still denies. Review this direction carefully; converting both paths into one falsy branch would weaken the documented policy.
- Phase C treats employee-profile enrichment as non-authoritative display data and degrades failure to a notice; authorization still happens in the guard path. Reviewers should preserve that separation.
- The filesystem guard coverage is intentionally subtractive/strict: a newly introduced route may require an explicit approved guard or a consciously documented public exemption rather than weakening the sweep.
- Experiments remain represented as `{}` in `resolveAccessContext`; do not consume that placeholder as if Phase E were implemented.
- The root `CLAUDE.md` still lacks the required access-control pointer until the orchestrator applies the surgical edit.

## 9. Verification the orchestrator must run

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any" <every path touched in this report>
```

Then manually sign in as each of `staff`, `admin`, `owner`, and `super_admin` and confirm that for every permission-gated section the sidebar decision and direct-URL decision agree.

The orchestrator should also apply the exact F.1 root `CLAUDE.md` insertion under `## Required Context`, immediately after the `.claude/rules/api-access.md` bullet:

```markdown
- Read `.claude/rules/access-control.md` before changing permissions, roles,
  access context, navigation gating, route guards, or any authorization
  decision in any app. It is the platform standard every product app follows.
```
