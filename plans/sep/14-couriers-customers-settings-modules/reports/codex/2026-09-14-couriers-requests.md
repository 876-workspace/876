# Couriers Requests handoff

## Files changed and why

- `apps/couriers/src/app/[orgSlug]/requests/**`: added the Requests list/detail split, new-request route, request record, Tasks and Activity tabs, server data loaders, and Couriers client adapters.
- `apps/couriers/src/app/[orgSlug]/customers/[id]/(detail)/requests/**`: added the customer Requests tab list, customer-scoped new request flow, and inline full-width request detail with Tasks and Activity tabs. The customer CRM lookup uses `billingCustomerId`.
- `apps/couriers/src/app/[orgSlug]/customers/[id]/_lib/customer-tabs.ts` and its test: added Requests after Payments and before Notes.
- `apps/couriers/src/app/api/manage/requests/**`: added Pattern A mutation routes for create, update, task create, event create, and event delete. Authorization runs before CRM access; errors are normalized through registered `@876/core` CRM/auth errors.
- `apps/couriers/src/lib/client/requests.ts` and `src/lib/client/index.ts`: added typed same-origin browser mutations.
- `apps/couriers/package.json`: added `@876/crm-ui`.
- `packages/crm-ui/src/customer-requests-panel.tsx`, `request-detail-card.tsx`, and `request-record.tsx`: added the inline layout prop while preserving the existing pane/card defaults. `request-list-detail-shell.tsx` accepts configurable takeover segments.
- CRM UI tests and Couriers route tests: added coverage for defaults, inline-vs-split behavior, customer tab order, and 15 route-handler cases.

## Decisions

- Top-level Requests uses the shared CRM list/detail shell; customer Requests deliberately does not, so selecting a request replaces the narrow tab list and provides a back link.
- Invoice/Billing-only `forms` and `customers` index sub-pages were skipped because they are not needed for the Couriers request workflow and would not be thin adapters for existing Couriers surfaces.
- No new environment entries were needed: `.env.example` already documents `CRM_API_URL`, `CRM_SERVICE_APP`, and `CRM_SERVICE_KEY`. These are the CRM variables Couriers production must provide; Vercel currently lacks them.

## Tests added

- 15 Couriers route-handler `it()` cases.
- 4 existing customer-tab tests updated for the ninth tab.
- 2 CRM UI panel layout tests and 1 CRM UI split-shell test.

## Verification

- `pnpm --filter @876/couriers-app typecheck` — passed.
- `pnpm --filter @876/couriers-app lint` — passed with 9 pre-existing warnings outside this scope; 0 errors.
- `pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/requests" "src/app/[orgSlug]/customers/[id]" src/app/api/manage/requests` — passed, 6 files / 55 tests. Vitest also printed the existing jsdom navigation notice.
- `pnpm --filter @876/crm-ui test` — passed, 6 files / 35 tests.
- `node scripts/check-app-structure.mjs` — passed (`app-structure: OK`).

## Could not do

- Did not edit sidebar/nav files, settings files, customer shared components, or other agents' work, per the file-scope rules.
- Did not commit or stage changes.
