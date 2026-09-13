# Brief E — Remaining Couriers sections onto the shared split view (empty detail cards)

Repo /root/projects/876, branch feature/couriers-modernization. Do NOT commit, branch, push, or write log files. Two other delegates are concurrently editing apps/couriers/src/app/[orgSlug]/packages/{layout.tsx,page.tsx,_components,(list),[id]} and apps/couriers/src/app/[orgSlug]/items/** — never touch those.

Reference to copy EXACTLY: apps/couriers/src/app/[orgSlug]/customers/ (layout.tsx → *-section.tsx via @876/ui/list-detail-section; *-list.tsx full table closed / condensed ListPane open via useDetailSegments; (list)/page.tsx returns null; [id]/(detail)/layout.tsx + page.tsx with DetailCard; layout awaits params only).
Read first: .claude/rules/app-layout.md §5a (Height checklist), navigation-performance.md, data-loading.md, testing.md, ai-code-quality.md, app-structure.md.

Sections, in scope:
1. apps/couriers/src/app/[orgSlug]/deliveries/
2. apps/couriers/src/app/[orgSlug]/disputes/
3. apps/couriers/src/app/[orgSlug]/packages/pre-alerts/
4. apps/couriers/src/app/[orgSlug]/packages/manifest/
5. apps/couriers/src/app/[orgSlug]/invoices/ (shared InvoicesTable rows already link to /invoices/<id>)
6. apps/couriers/src/app/[orgSlug]/payments/ (shared PaymentsTable rows already link to /payments/<id>)

For each: move toolbar + list into the section layout with the split-view shell, add [id]/(detail) routes rendering a DetailCard. The user has decided: where there is no backend retrieve for the record (deliveries, disputes, pre-alerts, manifest), the detail card is an EMPTY card — DetailCardHeader with the id and a close href, DetailCardBody containing short empty sections titled with the eventual shape (e.g. "Details", "Activity") and em dashes. No prose paragraphs, no "will appear here" copy. For invoices/payments use the existing Billing integration client the list data already uses to retrieve the record if a retrieve method exists (grep packages/billing/src/integration/resources); if one exists render its identity/status/amounts with @876/billing-ui panels where props fit; otherwise empty card.
Keep existing toolbars and StatusFilterHeading mounted; keep status badge in condensed rows. No eslint-disable / as any / @ts-ignore; do not weaken production code for tests.

Minimum tests: 3 it() per section (closed list, open list with selected row, detail card render).
Verify foreground from apps/couriers: npx tsc --noEmit; npx eslint src; npx vitest run; root: node scripts/check-app-structure.mjs.
Report: plans/2026-09-13-couriers-modernization/reports/opencode/remaining-split-views.md (per-section status, files, counted tests, verification, gaps).
