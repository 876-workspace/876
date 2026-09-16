# R1 — Projects rollout review fixes (Codex)

Branch: `fix/projects-rollout-review`. No commit/branch/push. No `eslint-disable`/`as any`/`@ts-ignore`.

## 1. One date formatter

Added `packages/projects-ui/src/format-date.ts` with `formatDate(seconds: number | null)` (em dash for null)
and `formatDateTime(seconds: number | null)`, exported via the `./format-date` subpath.
Majority format kept: `{ year: 'numeric', month: 'short', day: 'numeric' }` (date-only copies outnumbered
datetime ones 8–3); datetime adds `{ hour: '2-digit', minute: '2-digit' }`. Both use `en-US` + UTC, matching the
`time-tracking` precedent so server render and hydration agree.

Removed **13** local copies:

- `packages/projects-ui/src` (**8**): `project-detail`, `project-list`, `phase-detail`, `phase-list`,
  `issue-list` (date-only); `issue-comments`, `issue-detail` (datetime, now call `formatDateTime`);
  `time-tracking`'s export deleted outright — no external importers exist (only `timesheet-summary` and
  `time-entry-list` used it, both now import from `./format-date`), so no re-export was kept.
- `apps/projects/src/features/projects/components` (**5**): `cycle-header`, `cycle-list-data` (were ISO
  `YYYY-MM-DD`); `phase-comments` (datetime); `gantt-baselines` (custom UTC month labels, output-identical);
  `work-breakdown` (returned `null`; the null guard moved to the `dateRange` call site so an empty range still
  renders nothing).

Behaviour notes (intended by the consolidation): `issue-detail` null dates render `—` instead of `No date set`
(test updated); cycle dates render `Sep 2, 2026` style instead of `2026-09-02`; all outputs are now
deterministic UTC rather than server-local time.

## 2. One `formatDateInput`

Deleted the copy in `apps/projects/src/features/reports/capacity-input.ts` (**1** copy removed);
`capacity-form.tsx` now imports it from `@/lib/date-input`. The duplicate `formatDateInput` test block in
`capacity-input.test.ts` was removed (still covered by `date-input.test.ts`). Implementations were
byte-identical, so no behaviour change. The two `parseDateInput` variants were left alone: they have
different validation semantics (rollover rejection vs `Date.parse`) and were out of scope.

## 3. One error→HTTP status table

Added `apps/projects/src/app/api/_lib/error-status.ts` exporting `projectsErrorStatus(code: string): number`
(**47** explicit entries: 10 time + 6 reporting + 8 template + 9 per-route + 14 storage, plus the shared
`project-not-found` 404) with `*-not-found` → 404 and unknown → 400. Added `error-status.test.ts` covering the
union, the not-found rule, and the unknown default.

Deleted **14** mapping functions and **3** status tables, plus 1 file:

- `time-error-status.ts` (file, `timeErrorStatus` + table) — 10 time/timer/timesheet routes repointed.
- `reporting-api.ts` (`STATUS_BY_CODE` + `reportErrorStatus`; `serviceFailure`/`csvDownload`/schemas kept as-is,
  `serviceFailure` now delegates).
- `template-api.ts` (`STATUS_BY_CODE` + `templateErrorStatus`; `templateFailure`/include schema kept, delegates).
  `template-api.test.ts` now covers only `templateFailure`; status cases moved to `error-status.test.ts`.
- `lib/custom-modules/api-access.ts` (`serviceErrorStatus`) — 15 custom-modules/dashboard-widgets routes
  repointed; dead mock entry removed from `custom-modules/route.test.ts`.
- `attachments/_lib/attachments-api.ts` (private `attachmentErrorStatus`; `attachmentErrorResponse` and the rest
  kept, now delegates).
- **9** per-route functions: `createErrorStatus` ×2 (baselines, task-lists), `issueErrorStatus`,
  `relationErrorStatus` ×2, `dependencyErrorStatus` ×2, `suggestionErrorStatus`, `commentErrorStatus`.

Status conflicts: **none** among explicit entries — every code maps to the same status in every source
(`project-not-found` → 404 in four sources). One rule interaction, resolved per the brief (explicit wins) and
documented in the code: `storage/route-not-found` is explicitly 500 (own route-key fault) and takes precedence
over the `*-not-found` → 404 rule.

Inconsistent route-test expectations updated (**5** assertions in **4** files, all now match the union):

- `time-entries/route.test.ts`: `projects/invalid-request` 400 → **422** (canonical owner: reporting table).
- `timesheets/route.test.ts`: `projects/invalid-request` 400 → **422**.
- `comments/[commentId]/route.test.ts` (update + delete): `projects/issue-not-found` 400 → **404** (not-found rule;
  the old titles even mislabelled it "non-not-found").
- `project-templates/route.test.ts`: `projects/tenant-not-found` 400 → **404** (body code
  `error/bad-request` → `error/not-found`).

Scope note: generic `errorStatus` locals in routes outside the brief's named list (automation, cycles, events,
etc.) were left untouched; they already implement `*-not-found` → 404 and need no change.

## 4. App-side CSV

Deleted the local serializer in `apps/projects/src/lib/custom-modules/record-form-helpers.ts` (**5** functions:
`csvCell`, `toCsv`, `statusReportCsv`, `fieldReportCsv`, `createdReportCsv`) and their tests (the
`moduleReportCsvHref` helper and its test stay — the pages still link to the thin routes).

The owning service already serializes these reports as CSV with the injection guard
(`apps/projects-api/.../custom-modules.service.ts` via the shared reports serializer), but the `@876/projects`
client never sent `format=csv`, so the thin routes re-serialized JSON locally. Fixed at the client boundary,
mirroring `resources/reports.ts`:

- `packages/projects/src/resources/custom-modules.ts`: `toReportQuery` now passes `format` through, and
  `statusReport`/`fieldReport`/`createdReport` gained `{ format: 'csv' }` overloads returning `Result<string>`
  via `requestText` (inner-function style, as in `reports.ts`). Added a client CSV test.
- The three thin routes (`reports/by-status`, `reports/by-field`, `reports/created`) now proxy the service CSV
  bytes directly on `?format=csv` and only fetch JSON otherwise.

Behaviour notes: CSV content now carries the service injection guard (the deleted local serializer quoted cells
but did not guard `=+-@` prefixes) and CRLF endings per the shared serializer; the download filename now uses
the module id instead of the module key (the key only arrives with the JSON body).

## Verify

- `pnpm --filter @876/projects-ui typecheck` — pass
- `pnpm --filter @876/projects-ui test` — 68 files / 755 tests pass
- `pnpm --filter @876/projects-app typecheck` — pass
- `pnpm --filter @876/projects-app lint` — 0 errors (4 pre-existing `no-location-assign` warnings in untouched files)
- `pnpm --filter @876/projects-app test` — 231 files / 1566 tests pass
- `pnpm --filter @876/projects test` — 45 files / 324 tests pass (touched client package; extra check)
- `node scripts/check-app-structure.mjs projects` — OK
- `pnpm check:rsc-boundaries` — OK (10 apps)
