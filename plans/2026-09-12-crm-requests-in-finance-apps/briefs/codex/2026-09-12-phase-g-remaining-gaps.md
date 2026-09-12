# Brief 4: close the remaining gaps

Same branch, same rules and prohibitions as the earlier briefs. Do not commit,
do not branch, do not open a PR, do not run `prisma migrate`/`generate`.

The working tree already contains Phases A–F. Read `git status` and `git diff`
first. Build on what is there; do not rewrite finished files.

## Already fixed by the orchestrator — do not revert

- Billing request guards use Billing's live workspace vocabulary
  (`customers:read` to view, `customers:write` to create/edit). Billing has not
  migrated to the app-access plane, so `requests.*` keys are never granted there.
  Invoice keeps `requests.view` / `requests.create` / `requests.edit`.
- `apps/{billing,invoice}/src/lib/services/crm.ts` no longer throws on missing
  env; the transport returns `crm/not-configured` as a value.
- The customer requests route handlers use `safeParse`, the registered
  `crm/invalid-request` error, and `supportResponseStatus` for the HTTP status.
- `bleed` was removed from `@876/crm-ui/request-list-detail-shell`: the shell sits
  inside the customer card body, which keeps its own padding.
- Console's pinned permission counts and the layout placeholder tests were
  updated for the new keys and the split view.

## 1. Request record tabs — they currently 404

`request-detail-card.tsx` links to `…/tasks` and `…/activity`, but neither route
exists in `apps/invoice` or `apps/billing` under
`customers/[customerId]/requests/[requestId]/`.

- `tasks/page.tsx` — the request's tasks via the existing `requestTasks` resource
  (status, assignee, due date) and an add-task action through a thin route
  handler. Render a shared `@876/crm-ui` panel; do not invent a task concept.
- `activity/page.tsx` — the timeline, reusing `@876/crm-ui/request-events`.
- Each tab has its own Suspense boundary; the card chrome stays mounted.
- Route handlers mirror the fixed customer requests route exactly: `safeParse`,
  registered errors, `supportResponseStatus`, no throws.

## 2. Requests on invoice and payment records

On the invoice detail and payment detail pages in both apps: render
`@876/crm-ui/related-requests-panel` for that record, and a "New request" action
that opens the composer with `relatedResourceType` / `relatedResourceId` and a
display snapshot pre-filled (money as a string, never a JS `number`). List via
the existing `relatedResourceType` + `relatedResourceId` filter.

## 3. Console

On Console's CRM request record and request list
(`apps/console/src/app/(app)/workspace/[orgSlug]/crm/requests/`), render
`sourceApp` (as the product name, e.g. "876 Invoice"; `null` renders "—") and the
related financial record when present.

## 4. Tests

- 8 for the tasks and activity tabs and their handlers, including a failed CRM
  call rendering in place rather than crashing.
- 8 for invoice/payment related requests, including the pre-filled snapshot.
- 4 for Console source-app and related-record rendering, including `null`.
- 6 for the fixed customer requests route handler in each app: invalid query,
  invalid body, `crm/not-configured` → 503, a CRM error → 502, success 200/201,
  and forbidden → 403.

## 5. Report

Replace the stale status table in
`plans/2026-09-12-crm-requests-in-finance-apps/reports/codex/2026-09-12-crm-requests-in-finance-apps.md`
with the true state of every phase A–G and the counted `it()` totals.
