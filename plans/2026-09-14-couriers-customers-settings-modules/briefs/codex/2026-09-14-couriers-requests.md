# Brief E — 876 Couriers: Requests section + customer Requests tab

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read `.claude/rules/shared-product-ui.md`, `.claude/rules/app-api-routing.md`,
`.claude/rules/access-tiers.md`, `.claude/rules/finance-app-parity.md` (customer tab set).

## Goal
Bring CRM Requests into 876 Couriers the same way 876 Invoice and 876 Billing already
have them. Copy the existing pattern; do not invent one.

References (read fully before writing):
- Invoice: `apps/invoice/src/app/(app)/requests/**` (list/detail split, new, forms,
  customers, `[requestId]/{activity,tasks}`), `apps/invoice/src/app/(app)/customers/[customerId]/requests/**`,
  `apps/invoice/src/app/(app)/_components/related-requests-client.tsx`, and the invoice
  `src/app/api/**` request routes + `src/lib/services/crm*`.
- Billing: `apps/billing/src/app/(app)/requests/**` for the same.
- Shared UI: `packages/crm-ui` (`@876/crm-ui`) — import its screens/panels; do not copy
  components that already live there.
- Couriers already has `apps/couriers/src/lib/services/crm.ts` (CRM **service** client).

## Build
1. `apps/couriers/src/app/[orgSlug]/requests/**` — list + detail split view, new request,
   request detail tabs (activity, tasks) — mirroring Invoice, adapted to Couriers routing
   (`/[orgSlug]/requests/...`, org resolved from `getManageContext(orgSlug)`), authorization
   via the Couriers manage context/permission guards used by other couriers sections.
   If Invoice has `forms` / `customers` sub-pages, include them only if the shared crm-ui
   surfaces make it a thin adapter; otherwise skip and report.
2. Same-origin route handlers under `apps/couriers/src/app/api/manage/requests/**` (Pattern A,
   thin: authorize → one crm call → envelope) for every mutation the UI needs; typed browser
   client calls through `@/lib/client` like other couriers manage routes.
3. Customer record tab: add **Requests** to `apps/couriers/src/app/[orgSlug]/customers/[id]/_lib/customer-tabs.ts`
   and create `customers/[id]/(detail)/requests/**`. The customer's CRM identity is the
   couriers customer's `billing_customer_id` (registry id) — check how Invoice maps its
   customer to CRM requests and do the same.
   **Space fix:** inside the customer tab, the request list must NOT open a nested
   list/detail split (the card is too narrow). Clicking a request inside the tab opens the
   request full-width within the tab (the list is replaced; a back link returns to the list),
   at `customers/[id]/requests/[requestId]`. The top-level `/requests` section keeps the split.
   Prefer adding a prop to the shared `@876/crm-ui` component (e.g. a `layout`/`split` flag)
   over forking it, if the split lives in the package.
4. No sub-heading paragraphs, no descriptive empty-state sentences.
5. Do NOT edit the sidebar/nav (`components/shell/**`) — another agent adds the nav item.

## File scope
- `apps/couriers/src/app/[orgSlug]/requests/**`
- `apps/couriers/src/app/[orgSlug]/customers/[id]/(detail)/requests/**`
- `apps/couriers/src/app/[orgSlug]/customers/[id]/_lib/customer-tabs.ts` (+test)
- `apps/couriers/src/app/api/manage/requests/**`
- `apps/couriers/src/lib/services/crm.ts`, `apps/couriers/src/lib/client/**` (additive only)
- `packages/crm-ui/**` only for an additive prop needed by point 3 (report it)
- `apps/couriers/package.json` only to add `@876/crm-ui` if missing
Forbidden: `customers/_components/**`, `customers/new/**`, `api/manage/customers/**`,
`settings/**`, `components/shell/**`, any other app.

## Env
Report every env var the new code reads that 876-couriers production may lack
(Vercel currently has no `CRM_*` vars on 876-couriers). Add missing ones to
`apps/couriers/.env.example` with a comment.

## Tests (minimum 12 `it()`)
route handlers: unauthorized 403 without crm call, success envelope, crm error passthrough;
customer tab: tabs list includes Requests in the right position; in-tab request opens full
width (no split shell); top-level section uses the split; crm-ui prop default unchanged.

## Verify (run, report actual output)
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/requests" "src/app/[orgSlug]/customers/[id]" src/app/api/manage/requests
pnpm --filter @876/crm-ui test (if touched)
node scripts/check-app-structure.mjs

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-couriers-requests.md

## RESUME NOTE (15:30) — a previous run of this brief crashed mid-way
Partial edits from the crashed run are in the tree: `packages/crm-ui/src/{customer-requests-panel,request-detail-card,request-list-detail-shell}.tsx`,
`apps/couriers/src/app/api/manage/requests/**`, `apps/couriers/src/lib/client/requests.ts`,
`apps/couriers/package.json` (@876/crm-ui added; lockfile already updated). Review that diff,
keep what is correct, finish the rest.
- `apps/couriers/src/lib/client/index.ts` and `customers.ts` now contain another agent's finished
  customer changes — only add your requests export, do not alter customer code.
- Every error your route handlers return must come from a registered catalog
  (`apps/couriers/src/lib/errors/*`, add a `request.ts` registry file if needed, or reuse
  `@876/core` CRM_ERRORS) — no literal message strings.
- Another agent is still editing `settings/**` and `components/shell/**`; ignore their errors.
- Memory is tight: ONE verification command at a time.
