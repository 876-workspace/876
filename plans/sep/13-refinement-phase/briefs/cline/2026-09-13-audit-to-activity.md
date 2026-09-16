# Brief: rename record "Audit" tabs/pages to "Activity"

Working directory: `/root/projects/876-wt/activity-rename` (branch `refactor/audit-to-activity`). Work ONLY inside this directory.

## Goal
Every **record detail tab/page** named "Audit" becomes "Activity": the visible label, the route segment (`audit` → `activity`), every href pointing at it, page `<title>` metadata, and tests.

## Exact scope — these 9 route directories (use `git mv`, keep contents)
1. `apps/console/src/app/(app)/apps/[slug]/audit`
2. `apps/console/src/app/(app)/apps/[slug]/features/[featureId]/audit`
3. `apps/console/src/app/(app)/users/[username]/audit`
4. `apps/console/src/app/(app)/requests/[requestId]/(record)/audit`
5. `apps/console/src/app/(app)/settings/users/(team)/[id]/audit`
6. `apps/console/src/app/(app)/workspace/[orgSlug]/crm/requests/[requestId]/(record)/audit`
7. `apps/crm/src/app/(app)/requests/[requestId]/(record)/audit`
8. `apps/billing/src/app/(app)/items/[itemId]/audit`
9. `apps/couriers/src/app/[orgSlug]/customers/[id]/(detail)/audit`

Each becomes a sibling directory named `activity` (none of those parents already has `activity`).

## References to update (verify with grep afterwards)
- `apps/billing/src/app/(app)/items/[itemId]/page.tsx` (`/items/${item.id}/audit`)
- `apps/billing/src/app/(app)/items/[itemId]/layout.tsx` and `layout.test.tsx` (`{ label: 'Audit', href: .../audit }`)
- `apps/console/src/features/apps/app-detail-nav.ts` — the `audit` entry: key `activity`, label `Activity`, segment `/activity`. Keep the icon key if the icon registry has no `activity` icon; check the icon map in the same feature and update consistently, including any tests that reference the key.
- `apps/console/src/app/(app)/apps/[slug]/features/[featureId]/layout.tsx` (`{ label: 'History', href: `${base}/audit` }` → label `Activity`, href `/activity`)
- `apps/console/src/app/(app)/users/[username]/_lib/user-tabs.ts`
- `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/team-member-card-frame.tsx`
- `apps/couriers/src/app/[orgSlug]/customers/[id]/_lib/customer-tabs.ts` and `customer-tabs.test.ts`
- `packages/crm-ui/src/request-record-shell.tsx` (+ its tests if any)
- Inside each moved page: metadata titles such as `• Audit`, `- Audit`, `'Audit'` → `Activity`; visible headings "Audit" → "Activity".
- Any test, snapshot, or `scripts/check-app-structure.mjs` allowlist that names these paths.

Find the rest with:
```
grep -rn "audit" apps/console/src apps/crm/src apps/billing/src apps/couriers/src packages/crm-ui/src --include=*.ts --include=*.tsx | grep -iv "audit-log\|audit-events\|auditEvent\|audit_event\|writeAudit\|recordAudit\|audit(" 
```
Review each hit; change only record-tab/page naming.

## Must NOT change
- The global Console `apps/console/src/app/(app)/audit-log` page and its `/audit-log` links.
- API routes under `src/app/api/`, `audit_events`, `audit-events` modules, audit write helpers, analytics `./audit`, permission keys, database, SDK method names, component/function identifiers like `AuditTimeline` unless they are only used by the renamed page (leave identifiers alone when in doubt).
- No git commits. No log files. No other apps.

## Verify (run, fix failures)
```
pnpm --filter @876/console typecheck
pnpm --filter @876/crm-app typecheck || pnpm --filter ./apps/crm typecheck
pnpm --filter ./apps/billing typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/crm-ui typecheck
node scripts/check-app-structure.mjs
pnpm --filter ./apps/billing exec vitest run "src/app/(app)/items"
pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/customers"
```

## Report
Write `plans/2026-09-13-refinement-phase/reports/cline/2026-09-13-audit-to-activity.md`: every directory moved, every file edited, final grep output showing no remaining record `/audit` hrefs, verification results.
