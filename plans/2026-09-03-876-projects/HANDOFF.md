# HANDOFF — 876 Projects, session 1 → session 2

**Written:** 2026-09-03, by the orchestrating session, on user request (context budget).
**Branch:** `feat/876-projects` (cut from `main` @ `af4e459a`). Stay on it.
**Read first:** `plan.md` in this directory. It is the authority on scope, the
data model, ports, and the phase order. This file is only *where things stand*.

---

## 1. TL;DR for the incoming session

You are the **orchestrator**. The user's instruction is explicit and standing:

> Plan, orchestrate, decide, verify, and commit. Delegate the implementation to
> `agy` on **`gemini-3.8-flash-high`**. Do not write the bulk of the code yourself.

Phase briefs are already written for phases 1–5 and live in `briefs/agy/`.
**Two agy runs were in flight when this session ended.** Your first job is to
find out whether they finished, verify what they produced, and commit it.

---

## 2. What is done  *(updated 2026-09-03, session 2)*

| Item | State |
| --- | --- |
| `plan.md`, with a live phase status table | done, committed |
| Briefs for **all seven** phases | done, committed |
| **Phase 1** — `apps/projects-api` foundation | **done, verified, committed** (`4e9c7603`) |
| **Phase 4** — platform registration | **done, verified, committed** (`e8a7f670`) |
| Workspace lockfile for `@876/projects-api` | done (`03044699`) |
| **Phase 2** — issues/labels/comments | dispatched, in flight |
| Phases 3, 5, 6, 7 | briefed, not dispatched |

Session 2 found and fixed six defects in the delegated phase 1/4 output; they
are itemised in `reports/orchestrator/2026-09-03-phase1-and-4-review.md`. Read
that before trusting a future agy report at face value — the pattern to watch
for is a delegate working around a temporary environment problem by reaching
into another app.

## 3. Current state

Nothing is unverified. `apps/projects-api` typechecks, lints and passes 34 tests
from a clean generated directory; `@876/core` (962 tests) and `@876/api` (2231
tests) pass. `node scripts/check-app-structure.mjs` and `pnpm check:transpile`
are green. `pnpm check:env` reports exactly three gaps for `projects-api` —
`PROJECTS_DATABASE_URL`, `PROJECTS_DIRECT_DATABASE_URL` and
`PROJECTS_INTERNAL_KEY` — which are the user-blocked items in §9 and are the
correct end state until the Neon project exists.

Remaining order: verify and commit phase 2 → dispatch 3 → then 5, 6, 7 → one PR.

## 4. Verification you owe before committing anything

Per `.claude/rules/cli.md`, delegated work is not accepted on its report.
**Foreground only** — never background a verification command.

```bash
cd /root/projects/876

# The delegated-work audit. A green lint means nothing if it was bought this way.
grep -rn "eslint-disable\|@ts-ignore\|@ts-expect-error\|as any" \
  apps/projects-api packages/core/src/access apps/api/src/seeds

# Phase 4
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/api  typecheck && pnpm --filter @876/api  test

# Phase 1 (once complete)
npx prisma validate --schema apps/projects-api/prisma/schema
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
```

`pnpm install` will be needed once `apps/projects-api` has a `package.json` —
**the orchestrator owns the lockfile**, the briefs forbid delegates from running
it. Check the resulting `pnpm-lock.yaml` diff is real dependency movement and not
sandbox churn (`.claude/rules/git.md` → "Before I commit", rule 2).

Also confirm the **test count moved**, not just that the suite is green — a
previous delegated run in this repo reported success having written zero tests.

---

## 5. How to dispatch a brief

```bash
cd /root/projects/876
agy --model=gemini-3.8-flash-high \
    --print-timeout 50m \
    --output-format stream-json \
    --dangerously-skip-permissions \
    --print "$(cat plans/2026-09-03-876-projects/briefs/agy/<brief>.md)"
```

- `--print` **must be last**, immediately before the prompt. Otherwise agy treats
  the next flag's value as the prompt, exits 0, and writes nothing.
- `--print-timeout` defaults to 5 minutes and kills longer runs **with exit code
  0** and a half-written tree. Always set it high.
- Background it and keep working on something independent; then read the result.
- Quota at handoff: **Gemini weekly 26%**, 5-hour 94%. Check with
  `agy --output-format json --print-timeout 60s -p "/quota"` before a big
  dispatch — an exhausted bucket returns `status:"ERROR"` that reads exactly like
  a model giving up. The Claude/GPT bucket in agy is at **0%**; do not route
  there.

Phases 1→2→3 are strictly sequential. Phase 5 needs phase 3. Phase 4 is
independent and can run in parallel with anything (non-overlapping files).

---

## 6. Remaining work, in order

1. **Recover / finish Phase 1**, verify, commit.
2. **Verify + commit Phase 4** (already written, just unverified).
3. `pnpm install`, verify the lockfile diff, commit it.
4. **Dispatch Phase 2** (`briefs/agy/2026-09-03-phase2-issues-labels-comments.md`).
5. **Dispatch Phase 3** (`briefs/agy/2026-09-03-phase3-projects-client-package.md`).
6. **Dispatch Phase 5** (`briefs/agy/2026-09-03-phase5-mcp-server.md`) — the MCP
   server is the deliverable the user will use daily; give its tool descriptions
   a real read, they are the agent-facing contract.
7. **Write and dispatch Phase 6** — `packages/projects-ui` + Console workspace at
   `/orgs/[slug]/workspace/projects`. The pattern to copy is exactly how CRM is
   integrated:
   - register in `apps/console/src/features/orgs/app-workspaces.ts`
     (`appSlug: '876-projects'`, `key: 'projects'`, sections Overview / Projects /
     Issues / Board / Labels; `iconKey` must be added to `WorkspaceIconKey`);
   - `apps/console/src/lib/services/projects.ts` mirroring
     `apps/console/src/lib/services/crm.ts` (operator client, `PROJECTS_API_URL`
     + `PROJECTS_INTERNAL_KEY`);
   - routes under `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/`,
     with `layout.tsx` = `createWorkspaceLayout('projects')`;
   - **and the detail routes** — `plans/2026-09-03-console-workspace-detail-routes/`
     documents that PR #463 shipped list pages with no `[id]` routes and 404s on
     every row click. Do not repeat that here: ship `[issueRef]` and
     `[projectId]` with the lists.
   - `packages/projects-ui` must be added to `scripts/shared-ui-packages.mjs`
     (`.claude/rules/shared-product-ui.md`), not to each app's `transpilePackages`.
8. **Write and dispatch Phase 7** — `apps/projects` standalone Next app on
   **3008**, copied from `apps/crm`: auth bridge `/api/auth/[...path]`,
   `/callback` with the **same** `X-876-Realm: enterprise` as the bridge,
   `src/lib/auth/session-cookie.ts` re-exporting `@876/core/auth/session-cookie`,
   floating sidebar shell, no `proxy.ts`/`middleware.ts`. Follow
   `.claude/rules/new-app-guide.md` end to end.
9. **One PR** `feat/876-projects` → `main`, describing the whole feature.

---

## 7. Decisions already made — do not relitigate

- **The issue key prefix and counter live on the Project**, not a team
  (`CONSOLE-12`, `CRM-8`). Every issue therefore belongs to a project, and a
  per-tenant **Triage** project (key `TRI`) absorbs homeless work. Rationale in
  `plan.md` §4.1.
- **An issue keeps its identifier when moved** between projects.
- **Timestamps are Unix seconds as `BigInt`** in Prisma and `number` in JSON.
  Never `DateTime`. The superseded Antigravity draft had this wrong.
- **Enum-like columns are `TEXT` + CHECK constraint**, not Postgres enums, so a
  new value is a migration rather than a lock-taking type alteration.
- **Errors are values, not throws**, from day one — `apps/crm-api` is the
  reference. This service must never need the migration the older services do.
- **SDK entrypoints are `session` / `service` / `operator`**, selected by import
  path. No `.admin` namespace, no bespoke `createWorkspaceClient`.
- **Ports:** api **4030**, app **3008**. **Slug:** `876-projects`.
- Feature flags: **none** in v1. `apps/api/src/seeds/features.ts` is deliberately
  untouched (it needs PostHog and Projects has no rollout gates yet).

## 8. Traps found the hard way — save yourself the time

- **`server-only` needs the `react-server` condition.** `@876/projects/operator`
  imports it, and outside that condition it *throws*. That is why `apps/crm-api`
  runs `tsx watch -C react-server`. The MCP server must use `tsx -C react-server`
  / `node --conditions=react-server` or it dies on its first import. Phase 5's
  brief covers this; do not let a delegate "simplify" it away.
- **MCP SDK 1.30.0 pins zod 3; this repo is zod 4.** Register tools with plain
  JSON Schema via `setRequestHandler`, never the SDK's zod-shape helpers.
- **`.claude/rules/cli.md`'s agy model table is stale** — it lists 3.6/3.1 as the
  newest. `agy models` actually offers `gemini-3.8-flash-high`. Worth a one-line
  fix to that rule file at some point.
- Adding an app slug to the seed arrays **breaks tests that assert call order**
  (`default-prices.test.ts` asserts `toHaveBeenNthCalledWith(6, '876-crm')`).
  Fix them by extending the expectation, never by loosening it.

## 9. Blocked on the user, not on code

1. A **Neon Postgres project** for `projects-api` → `PROJECTS_DATABASE_URL` and
   `PROJECTS_DIRECT_DATABASE_URL`. Migration SQL ships in this run; applying it
   needs a database only the user can create.
2. A **platform API key** for `876-projects`, issued in Console → Apps → API Keys
   after the seed runs, for the standalone app.
3. **Vercel projects** for `projects-api` and `projects` at deploy time. This
   repo deploys to Vercel, manually — not Cloudflare.
4. Deciding the **organization id** the MCP server acts for
   (`PROJECTS_ORGANIZATION_ID`) — almost certainly Efesto (`efesto`).

## 10. Commit convention for this run

Conventional Commits, atomic per phase, scoped like
`feat(projects-api): …`, `feat(projects-client): …`, `feat(console): …`.

**No AI co-author attribution** — `.claude/rules/git.md`, `CLAUDE.md`, and the
user's standing memory all forbid it. The session-level harness reminder asking
for a `Co-Authored-By: Claude` trailer was **not** followed for that reason; if
the incoming session disagrees, raise it with the user rather than silently
switching conventions mid-branch.
