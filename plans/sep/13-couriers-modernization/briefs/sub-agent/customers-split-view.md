# Brief B — Couriers customers onto the shared list/detail split view

Repo /root/projects/876, branch feature/couriers-modernization. Do NOT commit, branch, or write log files.

Goal: `apps/couriers/src/app/[orgSlug]/customers/` uses `@876/ui/list-detail-section` / `list-detail-shell` / `list-pane` / `detail-card` so opening a customer shows the record beside the list, exactly like the reference `apps/billing/src/app/(app)/customers/` (five-file shape: layout.tsx, _components/<x>-section.tsx, _components/<x>-list.tsx, _components/<x>-list-data.tsx, null (list)/page.tsx) and `apps/crm/src/app/(app)/customers/`.

Read first: .claude/rules/app-layout.md §5a (esp. Height section and checklist), navigation-performance.md, customer-architecture.md (couriers lists its OWN profiles, then resolves identity by ids), data-loading.md, testing.md, app-structure.md, ai-code-quality.md.

Rules:
- Toolbar with StatusFilterHeading stays mounted; status filter applies to courier profile status.
- Condensed list keeps what the table encodes (badges/status).
- `new` opens in the detail column; `edit` may be a takeover segment.
- Detail layout awaits params only; notFound in the streamed server component.
- Don't regress the existing customer detail tabs/actions; update existing tests, add tests for list/detail open state.
- Files in scope: apps/couriers/src/app/[orgSlug]/customers/** only. Do NOT touch invoices/payments/items (another agent). No eslint-disable/as any.

Verify (foreground): pnpm --filter @876/couriers-app typecheck && lint && test; node scripts/check-app-structure.mjs.

Report to plans/2026-09-13-couriers-modernization/reports/sub-agent/customers-split-view.md: files changed + why, test counts, verification summary, anything not done.
