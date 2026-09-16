# 876 Projects Rollout — Session Handoff

**Written:** 2026-09-16, end of session one.
**Branch state:** everything merged to `main` (`ee68902f0`). No branch is mid-flight, no delegate is running, the working tree is clean.

---

## 1. Read this first

The rollout implements the user's 16-phase Projects feature order (Zoho-Projects-shaped). The master plan, phase table, delegate policy, UI-review gate and final-review gate all live in `plans/2026-09-15-projects-rollout/plan.md`. **Read that file before doing anything.** Each phase has its own folder `plans/2026-09-15-projects-phase-<n>/` holding `plan.md` (binding decisions), `briefs/<tool>/` and `reports/<tool>/`. The reports' "Unverified items" sections are the honest record of what was never actually exercised.

## 2. Server rescale — do this before resuming

The user is rescaling this Hetzner box to **cx43 (8 vCPU, 16 GB, 80 GB, $18.49/mo)** and has bought a **52 GB volume ($3.99/mo)**.

- The old box was 4 vCPU / 7.7 GB and was the hard limit on parallelism: runs were OOM-killed twice, and the dev server had to be stopped to run four delegates.
- A Hetzner rescale is in place and needs a reboot. Nothing is mid-flight, so it is safe to power off now.
- **After the reboot:** `pnpm install` (verify `node_modules` survived), then confirm `pnpm --filter @876/projects-api exec prisma generate` works before delegating.
- **Mount the volume and point Android tooling at it** when the React Native app starts: `ANDROID_SDK_ROOT` and `GRADLE_USER_HOME` on the volume, not `/`. Android SDK + one emulator image + Gradle cache is 30–40 GB and will otherwise fill the OS disk and break builds confusingly.
- Disk was cleaned this session: npm cache 16 G → 3.3 G, journals vacuumed ~1 G. `/` went 70% → 51% (36 G free). `/root/.codex` still holds ~5 GB of delegate transcripts and can be pruned.

## 3. More parallel agents — the new plan

With 16 GB and 8 vCPU, raise the ceiling from 4 concurrent delegates to **6–8**, still on strictly disjoint directories. The pattern that worked:

| Lane | Directory | Typical work |
| ---- | --------- | ------------ |
| API | `apps/projects-api/**` + `packages/projects/**` | schema, migration, service, routes, client resources |
| Shared UI | `packages/projects-ui/**` | presentation components + their tests |
| App | `apps/projects/src/**` | pages, route handlers, data loaders, browser clients |
| Docs | `docs/**` | documentation only |

Rules learned the hard way:

- **Two delegates must never share a directory.** Every brief names its owned paths and explicitly lists the directories other agents hold.
- **No worktrees for delegates** (repo rule + a past incident where mismatched `node_modules` symlinks produced false test results). They share the one checkout.
- **Pipeline across phases**: while lane A builds phase N's app UI, lane B can build phase N+1's API. That is how phases 8 and 9 landed together.
- **Spend order** (`.claude/rules/cli.md`): Cline free → opencode free → Command Code DeepSeek (prepaid, generous) → Codex `-p muse` (unlimited). GPT/Codex terra quota is out.
- **opencode stalled twice** on app work (25 minutes reading, nothing written). Command Code and Codex-muse were reliable. Prefer opencode for docs.
- Verification commands always run in the **foreground**; a delegate's exit code 0 proves nothing.

## 4. What is done (phases 1–9, all merged)

| Phase | PR | What shipped |
| ----- | -- | ------------ |
| 1 | #599 | Work-item detail and editing, type/state/phase/parent/sub-items/custom fields, resolved user details, activity timeline, project workspace, list and board filters, grouping |
| 2 | #600 | First-class Phases: list, detail, create/edit/clone, status, ordering, progress, owner, comments, activity, custom fields |
| 3 | #601 | Task Lists (create/edit/archive/restore/reorder/move), the project work breakdown, Cycles (list/detail/create/edit, assign work, progress, throughput) |
| 4 | #602 | Relationships (relates-to, duplicates, blocks), all four dependency types with lag, cycle rejection, planned dates, derived Blocked badge, advisory schedule suggestions |
| 5 | #603 | Gantt (collapse, zoom, drag/keyboard reschedule, connectors), server-computed critical path, immutable baselines with comparison |
| 6 | #604 | Calendar read model, events and meetings with attendees, recurrence rules expanded on read, reminders (intent only), My Work |
| 7 | #605 | Attachments through 876 Storage (new `projects.attachment` route policy), browser-to-R2 upload, links on projects/phases/task lists/work items |
| 8+9 | #606 | Time entries, timers, timesheets with approvals; budgets, rates, planned-vs-actual, idempotent invoice handoff to Billing; three debt fixes; docs rewrite |

**Current test counts on `main`:** projects-api 708, `@876/projects` 153, projects-ui 234, Projects app 678. Typecheck and lint clean in all four; app-structure and RSC boundary checks pass.

## 5. What is left

**Phase 9 is half done.** The API and client exist (billing config, budgets, rates, financial summary, invoice drafts). There is **no UI** — no budget screens, no rate management, no financial summary page, no "create invoice from approved time" action. That is the first job.

Then phases 10–16, unstarted:

- **10 — Reports and resource planning:** status/health reports, work by state/type/assignee, overdue, phase progress, cycle throughput, time by project/user/work item, billable vs non-billable, planned vs actual, budget variance, dashboards, workload, capacity, utilisation, CSV export.
- **11 — Templates and cloning:** project templates (phases, task lists, work items, dependencies, module config, layouts, budget defaults), relative date scheduling, create-from-template, project cloning.
- **12 — Custom fields and layouts:** project/phase custom fields, layouts with sections and multi-column, field ordering, visibility, assignment by type, layout rules (conditional visibility/required/disabled).
- **13 — Workflow automation:** controlled transitions with permissions and required fields, blueprint-style workflows, rules on created/updated/state-changed/phase-completed/due-approaching/time-submitted/budget-threshold, automated field updates, assignments, labels, reminders, events, notifications, webhooks, sub-item creation.
- **14 — Collaboration and client experience:** followers, mentions, activity feed, client portal (client-visible phases/work/files/comments/time/invoices), discussions, wiki pages.
- **15 — Custom modules:** org and project custom modules, definitions, fields, layouts, records, statuses, permissions, relationships, reports, automation, widgets.
- **16 — External platform:** public API and scopes, webhooks with signing and retries, CSV import/export, Jira/Zoho/Trello/Asana importers, MCP read and approved write operations, observability dashboards.

## 6. Two gates that must run before deploy

Both are recorded in `plans/2026-09-15-projects-rollout/plan.md` and **neither has been done**.

1. **UI review by the orchestrator, not a delegate.** No delegate opened a browser in this entire session; every UI claim rests on jsdom tests. Run the app and API locally, walk every surface phase by phase, screenshot each with the Browserbase `browse` CLI, and check against `.claude/rules/app-layout.md` and the UI Copy rule. Write it up in `plans/2026-09-15-projects-rollout/reports/orchestrator/ui-review.md`. Layout and copy fixes are the orchestrator's own work.
2. **Final code-quality review.** The user's words: _"cheap models write shit code."_ Review the whole rollout diff (`main` vs the rollout's first commit) for the failure modes already caught by hand this session: duplicated helpers, invented values, business logic leaking into route handlers, fixtures papering over contract changes, tests that never ran. Fix findings on `fix/projects-rollout-review` with its own PR.

## 7. Migrations — important

Dev and production share the same Neon database (pre-launch).

- **Applied:** everything through `20260919000000_calendar_reminders` (done this session, with the user's explicit approval).
- **NOT applied:** `20260920000000_time_tracking` and `20260921000000_project_finance`.
- The Projects app will 500 on time-tracking and finance routes until they are applied. Run `pnpm --filter @876/projects-api exec prisma migrate status`, then `migrate deploy`. **Ask the user before applying** — it is a production schema change.

## 8. Deploy — not done

Nothing from this rollout has been deployed. Vercel only; **do not deploy to Cloudflare** (retired — see `.claude/rules/deployment.md`, added this session). Ignore CI status: GitHub Actions minutes are exhausted, so local verification is the merge gate. Apps to deploy at the end: `projects`, `projects-api`, `storage-api` (phase 7 route policy), and any consumer of `@876/projects` / `@876/projects-ui`.

## 9. Known debt

Tracked in `plans/2026-09-15-projects-rollout/briefs-debt.md`:

1. Gantt and time-entry rows link work items by `id`; `issue-list` links by `identifier`. Both resolve, but the id form gives unreadable URLs and page titles. Settle on `identifier`; `GanttRow` would need to carry it.
2. Attachment lists are unpaginated — a record with very many attachments resolves them all in one render.
3. Download URLs expire after ~300 s; a page left open shows a stale link until re-render.
4. Times render in UTC; there is no time-zone preference anywhere.
5. Reminders have no scheduler. Nothing delivers them, and the UI is written to avoid claiming otherwise.
6. Phase 5 `zoom` is validated but advisory; it does not re-bucket gantt rows server-side.

## 10. Mistakes from this session worth not repeating

- **`git add -A` swept partially-written delegate code into a commit.** Phase 9 finance code was committed mid-run. It was caught by running the tests and finished properly, but stage explicit paths while a delegate is still writing.
- **A `git stash pop` applied an unrelated old stash** because there was nothing to stash. Check `git stash list` before popping.
- Two real defects were found only by running the suite, never by a delegate's own report: a fixed-fee config could save with no amount (checked `!== null`, but an omitted field is `undefined`), and a client namespace test was left stale. Always run the suite yourself.
