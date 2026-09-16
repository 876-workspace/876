# Brief 14c — Projects app: activity, followers, discussions, wiki, client portal

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; no run logs. Touch only `apps/projects/**` (another agent edits `apps/console/**`). Read `plans/sep/16-projects-phase-14/plan.md`, `.claude/rules/access-tiers.md`, `.claude/rules/app-api-routing.md`.

## Read
Client resources `packages/projects/src/resources/{followers,activity,discussions,wiki,client-grants}.ts` and `packages/projects/src/portal.ts`; props of `packages/projects-ui/src/collaboration/*.tsx`; patterns `apps/projects/src/app/(app)/settings/automation/**` + routes; project tabs `apps/projects/src/app/(app)/projects/[projectId]/_components/project-tabs.tsx`; auth guards `apps/projects/src/lib/auth/*`.

## Deliver
- Project tabs: **Activity**, **Discussions** (list/new/thread with replies, pin/lock for `projects.edit`), **Wiki** (tree, page view, new/edit with `MentionInput`, revisions, restore), **Clients** (grants list, invite by existing org member search, revoke — `projects.edit`).
- Follow button on project, phase and work-item detail; global `/activity` page.
- Client-visible toggle (`projects.edit`) on phase, work item, attachment, comment, discussion detail.
- **Client portal** under `app/portal/[projectId]/**` (outside the `(app)` group, its own layout): guard = signed-in session + active client grant resolved through the portal client (never `projects.view`); pages Overview, Phases, Work, Files, Discussions, Time (hours by phase), Invoices (status). Uses `@876/projects/portal` only, never the internal client. Portal route handlers under `app/api/portal/[projectId]/**` for replies.
- Routes for all internal mutations, thin and permission-checked; the acting user always from the session.
- Tests floor **70 `it()`**, including: portal page never imports the internal projects service (static import test), portal guard denies without grant, revoked grant denied.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-14/reports/codex/14c-app.md`.
