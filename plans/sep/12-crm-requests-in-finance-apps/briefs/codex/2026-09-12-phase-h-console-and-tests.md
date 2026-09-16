# Brief 5: Console rendering, owed tests, and the true report

Same branch, same rules and prohibitions as the earlier briefs. Do not commit,
branch, open a PR, or run `prisma migrate`/`generate`. Read `git status` and
`git diff` first; build on the tree, do not rewrite finished files, and do not
revert anything listed under "fixed by the orchestrator" in brief 4.

Verified state right now: every package typechecks; crm-api 775, crm 247,
crm-ui 25, core 1,098 tests pass. Tasks/Activity tabs and invoice/payment related
requests exist in both finance apps.

## 1. Console — not done yet

In `apps/console/src/app/(app)/workspace/[orgSlug]/crm/requests/` (list and
record) render:

- `sourceApp` as the product name — `876-invoice` → "876 Invoice",
  `876-billing` → "876 Billing", `876-crm` → "876 CRM", `876-console` →
  "876 Console"; `null` renders an em dash in `text-muted-foreground`. Keep the
  slug→name map in one place, not per component.
- the related financial record (type label + snapshot number, falling back to the
  id) when present, em dash otherwise.

Tier-3 metadata styling per `app-layout.md` §12. No new data fetch — these fields
are already on the request.

## 2. Tests owed — none of these exist yet

| Area                                                                                                                                                                                                                                                   | Minimum `it()` |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------: |
| `apps/invoice` + `apps/billing` customer requests route handler (each app): invalid query → 422, invalid JSON body → 422, forbidden → 403, `crm/not-configured` → 503, other CRM error → 502, success → 200 / 201 with the full `{ data, error }` body |             12 |
| tasks route + activity route handlers, both apps: success, forbidden, CRM error rendered as a value                                                                                                                                                    |              8 |
| invoice/payment related-requests: filter args passed exactly, snapshot money is a string, "New request" pre-fills type/id                                                                                                                              |              8 |
| Console source-app + related-record rendering, including `null`                                                                                                                                                                                        |              5 |
| `@876/crm-api` by-billing-customer routes: tenant isolation, unknown billing id, sourceApp from credential, body `sourceApp` rejected                                                                                                                  |              8 |

Follow `.claude/rules/testing.md`: exact values, exact call counts and arguments,
complete result shapes, negative space. Check each package's `vitest.config.ts`
environment before writing a component test. Mock the CRM client at the
`@/lib/services/crm` boundary; do not mock the unit under test.

## 3. Report — replace, do not append

The status table in
`plans/2026-09-12-crm-requests-in-finance-apps/reports/codex/2026-09-12-crm-requests-in-finance-apps.md`
still says Phases D and E are "blocked". Rewrite the whole report to describe the
tree as it actually is after this run: every phase A–H with its true status,
counted `it()` totals per test file, files changed, the migration SQL, decisions,
and anything still not done.
