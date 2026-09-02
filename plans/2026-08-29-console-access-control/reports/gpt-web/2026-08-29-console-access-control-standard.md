# Console Access Control Standard — GPT Web Completion Report

## 1. Summary

This branch now contains the shared `@876/core/access` context/navigation primitives and a canonical Console permission catalog, and Console consumes those primitives for effective permissions and server-resolved navigation. Console grants now carry affiliation, expiry, justification, title, and inviter metadata, with service validation and guard-time expiry/employment checks. The Team list was rebuilt to remove the per-member identity N+1, add lifecycle filtering and required columns, keep orphaned grants visible as explicit unresolved accounts, and expose a permission-checked same-origin revoke operation for those grants. The platform access-control rule and architecture decision record now document the three enforcement layers, permission/feature/experiment separation, tier-based role storage, and the adoption path for future apps. I did not execute builds, tests, lint, typechecks, migrations, shell commands, or database operations; verification remains the orchestrator's responsibility.

## 2. Per-phase status

| Phase | Status | Files touched | Test-case count actually written/changed |
| --- | --- | --- | --- |
| 0 — core primitives | complete | `packages/core/src/access/{catalogs,context,navigation,index}.ts` and tests | Existing phase suite present on branch; exact pre-existing case count was not independently re-counted in this pass. |
| 1 — catalog adoption | complete | `apps/console/src/lib/permissions.ts`, `permissions.test.ts` | Existing phase suite present on branch; exact pre-existing case count was not independently re-counted in this pass. |
| 2 — access context | complete | `apps/console/src/lib/auth/access-context.ts`, `guards.ts`, `route-guard.ts`, `features.ts`, `access-context.test.ts` | Existing phase suite present on branch; exact pre-existing case count was not independently re-counted in this pass. |
| 3 — navigation | partial | shell/nav files and settings page/layout | Existing production work is present, but I did not add the requested registry-to-route binding suite or exact per-role visible-href suite in this pass. |
| 4 — affiliation & expiry | partial | Prisma schema/migration, env example, team create/update/validation, guards, access-denied page | Production policy is present; the requested 25-case Phase 4 guard/service test floor is not met by branch changes I could verify. |
| 5 — team page | complete | team list page/row/skeleton, service list, typed browser client, revoke route | **26** new tests in this pass: 8 service-list + 6 route + 4 client + 8 row tests. |
| 6 — guard sweep | skipped | none | 0. I did not claim a repository-wide route/page sweep without being able to execute the required filesystem test/grep. |
| 7 — documentation | partial | `.claude/rules/access-control.md`, `docs/architecture/013-console-access-control.md` | 0. The root `CLAUDE.md` pointer line remains a deliberate gap described below. |

## 3. Every file changed on the branch relative to `main`

The following list is based on the GitHub comparison of `main` to `feat/console-access-control` after the implementation/docs commits.

- `.claude/briefs/gpt-web/2026-08-29-console-access-control-standard.md` — checked-in implementation brief that defines this branch's work.
- `.claude/reports/gpt-web/README.md` — report-directory guidance already present on the branch.
- `.claude/rules/access-control.md` — new platform-wide RBAC/UI-gating standard.
- `apps/console/.env.example` — documents optional `CONSOLE_STAFF_ORGANIZATION_ID` configuration.
- `apps/console/prisma/migrations/20260829000000_console_member_affiliation/migration.sql` — additive grant-affiliation migration.
- `apps/console/prisma/schema/user.prisma` — adds affiliation/title/expiry/justification/inviter metadata to Console grants.
- `apps/console/src/app/(app)/layout.tsx` — integrates the request-scoped access/navigation path.
- `apps/console/src/app/(app)/settings/page.tsx` — permission-resolves settings navigation.
- `apps/console/src/app/(app)/settings/users/(list)/page.tsx` — rebuilds the Team list, batches identities, adds toolbar/status filtering and all requested columns.
- `apps/console/src/app/(app)/settings/users/_components/member-row.test.tsx` — covers resolved/unresolved grant rows, expiry, badges, and revoke behavior.
- `apps/console/src/app/(app)/settings/users/_components/member-row.tsx` — renders Position/Affiliation/Role/Expires and first-class unresolved-account rows.
- `apps/console/src/app/(app)/settings/users/_components/team-skeleton-columns.ts` — aligns loading columns with the real Team table.
- `apps/console/src/app/access-denied/page.tsx` — adds expired/employment denial reasons.
- `apps/console/src/app/api/team/[id]/route.test.ts` — covers permission-checked grant revocation.
- `apps/console/src/app/api/team/[id]/route.ts` — adds the thin same-origin revoke route guarded by `team:revoke`.
- `apps/console/src/components/shell/mobile-nav.tsx` — consumes resolved serializable navigation.
- `apps/console/src/components/shell/nav-config.ts` — declares permission-annotated navigation with string icon keys.
- `apps/console/src/components/shell/nav-icons.ts` — resolves icon keys inside the client boundary.
- `apps/console/src/components/shell/settings-options.ts` — permission-annotates settings navigation.
- `apps/console/src/components/shell/shell.tsx` — resolves request navigation server-side before handing data to client shell components.
- `apps/console/src/components/shell/sidebar.tsx` — renders already-resolved navigation rather than filtering the full registry in-browser.
- `apps/console/src/components/shell/topbar-search.tsx` — adapts search/navigation data to the new registry shape.
- `apps/console/src/lib/auth/access-context.test.ts` — exercises request access-context composition.
- `apps/console/src/lib/auth/access-context.ts` — adds the request-scoped Console `AccessContext` resolver.
- `apps/console/src/lib/auth/guards.ts` — rebuilds guards atop access context and enforces expiry/staff employment verification.
- `apps/console/src/lib/auth/route-guard.ts` — aligns route-handler permission/capability guards with shared access context.
- `apps/console/src/lib/client/index.ts` — exposes the typed `team` browser resource.
- `apps/console/src/lib/client/team.test.ts` — covers the same-origin revoke client contract.
- `apps/console/src/lib/client/team.ts` — adds the typed browser-side grant revoke call.
- `apps/console/src/lib/features.ts` — adapts existing feature evaluation for request access-context composition.
- `apps/console/src/lib/permissions.test.ts` — covers catalog-derived permission vocabulary/system-role invariants.
- `apps/console/src/lib/permissions.ts` — removes the separate permission vocabulary in favor of the canonical catalog.
- `apps/console/src/lib/service/team/create.ts` — validates affiliation/expiry/justification/title on grant creation.
- `apps/console/src/lib/service/team/list.test.ts` — covers server-side active/suspended/expired filtering and exact Prisma query shapes.
- `apps/console/src/lib/service/team/list.ts` — adds service-layer lifecycle filtering used directly by the status UI.
- `apps/console/src/lib/service/team/update.ts` — validates affiliation policy on grant updates.
- `apps/console/src/lib/service/team/validation.ts` — centralizes grant policy validation.
- `docs/architecture/013-console-access-control.md` — records the design decisions and new-app adoption sequence.
- `packages/core/src/access/catalogs.test.ts` — covers the Console catalog and anti-drift behavior.
- `packages/core/src/access/catalogs.ts` — adds and registers the canonical Console catalog.
- `packages/core/src/access/context.test.ts` — covers `can`, `hasFeature`, and experiment variant lookup behavior.
- `packages/core/src/access/context.ts` — defines shared `AccessContext` query primitives.
- `packages/core/src/access/index.ts` — exports the new shared access primitives.
- `packages/core/src/access/navigation.test.ts` — exercises declarative navigation resolution/serialization/immutability.
- `packages/core/src/access/navigation.ts` — defines the shared serializable navigation contract/resolver.

## 4. Migration

Exact path:

`apps/console/prisma/migrations/20260829000000_console_member_affiliation/migration.sql`

Full contents:

```sql
ALTER TABLE "console_members" ADD COLUMN "affiliation" TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE "console_members" ADD COLUMN "title" TEXT;
ALTER TABLE "console_members" ADD COLUMN "expires_at" BIGINT;
ALTER TABLE "console_members" ADD COLUMN "justification" TEXT;
ALTER TABLE "console_members" ADD COLUMN "invited_by" TEXT;
```

The orchestrator must apply this migration through the repository's normal Prisma/Neon migration procedure. I did **not** run `prisma migrate`, SQL, or any database operation.

## 5. Decisions I made that the brief did not settle

### Team-list status semantics

`status=expired` is implemented as `expiresAt <= now` regardless of the persisted `status` column, because expiry is a time-derived state rather than a third persisted lifecycle value. `status=active` requires persisted `status = active` and either no expiry or an expiry in the future. `status=suspended` uses the persisted suspended status directly. This prevents an expired active grant from appearing in both Active and Expired views.

### Orphan revoke transport

The brief requires a destructive Revoke affordance for unresolved grants but does not name the route. I added the Console-owned route `/api/team/:id`, guarded by `team:revoke`, plus `client.team.revoke()`. This follows `api-access.md`: browser mutations use a typed same-origin app resource route; the route authorizes and calls the Console-owned service.

### Revoke idempotency

The service already uses `deleteMany`, so revoking a grant that no longer exists returns count `0` instead of throwing a Prisma P2025. The new route preserves that idempotent behavior and returns the exact count.

### Staff Position when no batch employee-profile verb exists

I searched the exposed platform types/facade surface for employee profile/job-title support. The organization-member type exposes `position`, but the branch does not expose a suitable batch-by-grant-IDs operation I could safely call from this page without inventing a new verb or doing an N+1. Per the brief, I did not invent one and did not loop per staff row. The row currently uses the grant `title` fallback; because service policy rejects a `title` on `staff`, staff rows display an em dash until the orchestrator adds/wires a batch employee-position operation.

### Unresolved account navigation

An unresolved row remains navigable to the existing grant detail route and also shows a Revoke button. The button stops row click propagation so revocation does not accidentally navigate away.

### Documentation mirroring

The root repository rule says shared rules are normally mirrored into `.agents` and `.grok`, while this implementation brief explicitly says not to copy the new access-control rule into those trees. I followed the more specific branch brief and changed only `.claude/rules/access-control.md`.

## 6. Things I could not verify

- I could read repository files and GitHub branch state, but I was explicitly prohibited from executing shell commands, tests, typechecks, lint, builds, migrations, or database checks. Therefore I cannot truthfully say any suite passes.
- I did not independently recount every `it()` already written in Phases 0–4 before this pass. The branch contains large phase test suites, but this report does not fabricate an exact case count for work I did not count.
- I could not verify runtime Prisma generated types after the schema change because generation/typecheck is orchestrator work.
- I could not verify the final rendered Team table in a browser.
- I could not prove that every Console page and every mutating route handler is guarded because the requested Phase 6 filesystem/grep sweep was not executed.
- I did not find a safe batch employee-profile/job-title operation on the current Console facade for staff Position resolution.

## 7. Gaps deliberately left

### Phase 6 guard sweep

I did not create `apps/console/src/lib/auth/guard-coverage.test.ts` without first being able to perform the complete repository route sweep it is intended to codify. A knowingly incomplete allow-list would turn a security test into a false certificate. The orchestrator should perform the sweep, fix uncovered handlers/pages, then add the filesystem coverage test.

### Navigation binding/per-role exact-list tests

The production registry/shell changes are present, but the requested exact visible-href tests for all four roles and the registry-to-destination binding test were not added in this pass. These remain required before merge.

### Phase 4 test floor

The production affiliation/expiry behavior is present, but the branch does not yet demonstrate the brief's requested 25-case validation/guard floor. In particular, the old `guards.test.ts` needs to be expanded for staff membership active/inactive/error/throw/unconfigured cases and expiry-on-next-request behavior.

### Root `CLAUDE.md` pointer line

I did not replace the whole root `CLAUDE.md` through the GitHub contents API merely to insert one line. The connector's write operation replaces a complete blob, while the file is large and read responses are windowed; reconstructing it by hand would create an unnecessary high-risk chance of truncation or unrelated drift. The orchestrator should add one line under `Required Context`: `Read .claude/rules/access-control.md before changing permissions, access context, navigation gating, route guards, or authorization.`

### Staff position batch resolver

As noted above, no suitable batch employee-position facade verb was identified. The page therefore remains N+1-free and truthful, but staff Position will be `—` until that operation exists.

## 8. Risk notes

- `team:revoke` is now exercised by a new route. The canonical Console catalog on this branch already declares the team module including revoke; the orchestrator should confirm the intended system roles actually grant it where needed before relying on the UI affordance for non-super-admin operators.
- Permission keys persisted in live role rows must remain byte-for-byte stable. The implementation intentionally centralizes the catalog instead of renaming existing keys.
- `active` status filtering uses current Unix seconds inside the service. Boundary behavior is deliberately `expiresAt <= now` => expired.
- Employment verification deliberately fails open only on infrastructure/provider failure because it is subtractive. An explicit inactive/missing membership denies access. Do not refactor those two paths into one falsy check.
- The new unresolved-row Revoke button has no additional confirmation dialog in this pass. The operation is destructive but idempotent; the orchestrator may choose to add the repository-standard destructive confirmation before merge.
- Tests added in this pass were authored but not executed; compile/runtime assumptions still require verification.

## 9. Verification the orchestrator must run

I executed **none** of these commands. Run them in this order after adding the remaining Phase 3/4/6 coverage and the `CLAUDE.md` pointer:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
npx prettier --check packages/core/src/access apps/console/src/lib/auth apps/console/src/lib/service/team apps/console/src/lib/client/team.ts apps/console/src/lib/client/team.test.ts 'apps/console/src/app/(app)/settings/users' 'apps/console/src/app/api/team' .claude/rules/access-control.md docs/architecture/013-console-access-control.md .claude/reports/gpt-web/2026-08-29-console-access-control-standard.md
grep -rn "eslint-disable" packages/core/src/access apps/console/src/lib/auth apps/console/src/lib/service/team apps/console/src/lib/client 'apps/console/src/app/(app)/settings/users' 'apps/console/src/app/api/team' .claude/rules/access-control.md docs/architecture/013-console-access-control.md .claude/reports/gpt-web/2026-08-29-console-access-control-standard.md
```

Then apply the migration through the repository's normal migration workflow and manually inspect Console navigation/Team rendering as each of `staff`, `admin`, `owner`, and `super_admin`.
