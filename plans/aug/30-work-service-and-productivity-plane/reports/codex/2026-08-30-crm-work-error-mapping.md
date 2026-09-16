# CRM Work error mapping

## Final CRM error codes

The existing `crm/work-unavailable` contract is unchanged and now means that
CRM could not establish a usable Work response: a Work/identity outage,
internal Work failure, unknown upstream failure, or code-less transport
failure.

Added codes:

| Code                          | HTTP status | Purpose                                                                                 |
| ----------------------------- | ----------: | --------------------------------------------------------------------------------------- |
| `crm/work-forbidden`          |         403 | The acting user lacks permission for the requested Work operation.                      |
| `crm/work-invalid-response`   |         502 | Work returned a malformed response, including an impossible paginated list.             |
| `crm/work-not-connected`      |         403 | CRM has no usable authenticated/scoped connection to the organization’s Work workspace. |
| `crm/work-workspace-inactive` |         409 | The organization’s Work workspace exists but is inactive.                               |
| `crm/work-workspace-missing`  |         404 | The organization was never provisioned into Work.                                       |

The first, third, and fifth codes are the requested connection/scope,
workspace-missing, and acting-user-denial categories. I also added
`crm/work-workspace-inactive` and `crm/work-invalid-response`: both are clear
responses from Work or locally-detected malformed Work pagination, so calling
either an outage would repeat the incident’s diagnostic failure.

`work/invalid-api-key`, `work/not-configured`, and `work/unauthorized` map to
`crm/work-not-connected`, rather than `crm/work-forbidden`: these occur before
an acting user is authorized and are resolved by restoring CRM’s Work
integration/configuration. `work/session-forbidden` is the actual acting-user
authorization denial and maps to `crm/work-forbidden`.

## Upstream-to-CRM mapping

| Work result code                                   | CRM result code               |
| -------------------------------------------------- | ----------------------------- |
| `work/connection-forbidden`                        | `crm/work-not-connected`      |
| `work/invalid-api-key`                             | `crm/work-not-connected`      |
| `work/not-configured`                              | `crm/work-not-connected`      |
| `work/unauthorized`                                | `crm/work-not-connected`      |
| `work/tenant-not-found`                            | `crm/work-workspace-missing`  |
| `work/tenant-inactive`                             | `crm/work-workspace-inactive` |
| `work/session-forbidden`                           | `crm/work-forbidden`          |
| `work/invalid-request`                             | `crm/invalid-request`         |
| `work/invalid-response`                            | `crm/work-invalid-response`   |
| `work/identity-unavailable`                        | `crm/work-unavailable`        |
| `work/internal`                                    | `crm/work-unavailable`        |
| Any unrecognized code, including `network/offline` | `crm/work-unavailable`        |
| Code-less transport error, `null`, or `undefined`  | `crm/work-unavailable`        |

`workErrorToCrm()` logs `work_error_mapped` at warn with the upstream code,
upstream message, and selected CRM code. The CRM logger redacts credential
field names at every depth.

## 28 former blanket mappings

| Service    | Site                                            | Classification and result                                      |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------- |
| Reminders  | `listWork`: Work list error                     | Upstream; `workErrorToCrm(result.error)`.                      |
| Reminders  | `listWork`: `has_more` with no last reminder    | Local malformed pagination guard; `crm/work-invalid-response`. |
| Reminders  | `listWork`: 20-page exhaustion                  | Local malformed pagination guard; `crm/work-invalid-response`. |
| Reminders  | `findWorkReminder`: retrieve error              | Upstream; mapper (after local Work not-found handling).        |
| Reminders  | `create`: create error                          | Upstream; mapper.                                              |
| Reminders  | `update`: update error                          | Upstream; mapper (after local Work not-found handling).        |
| Reminders  | `remove`: delete error                          | Upstream; mapper (after local Work not-found handling).        |
| Tasks      | `listWork`: Work list error                     | Upstream; mapper.                                              |
| Tasks      | `listWork`: `has_more` with no last task        | Local malformed pagination guard; `crm/work-invalid-response`. |
| Tasks      | `listWork`: 20-page exhaustion                  | Local malformed pagination guard; `crm/work-invalid-response`. |
| Tasks      | `findWorkTask`: retrieve error                  | Upstream; mapper (after local Work not-found handling).        |
| Tasks      | `create`: create error                          | Upstream; mapper.                                              |
| Tasks      | `update`: update error                          | Upstream; mapper (after local Work not-found handling).        |
| Tasks      | `remove`: delete error                          | Upstream; mapper (after local Work not-found handling).        |
| Events     | `listWorkEvents`: Work list error               | Upstream; mapper.                                              |
| Events     | `listWorkEvents`: `has_more` with no last event | Local malformed pagination guard; `crm/work-invalid-response`. |
| Events     | `listWorkEvents`: 20-page exhaustion            | Local malformed pagination guard; `crm/work-invalid-response`. |
| Events     | `findWorkEvent`: retrieve error                 | Upstream; mapper (after local Work not-found handling).        |
| Events     | `resolveCalendarId`: ensure-primary error       | Upstream; mapper.                                              |
| Events     | `create`: create error                          | Upstream; mapper.                                              |
| Events     | `update`: update error                          | Upstream; mapper (after local Work not-found handling).        |
| Events     | `remove`: delete error                          | Upstream; mapper (after local Work not-found handling).        |
| Events     | `listParticipants`: list error                  | Upstream; mapper.                                              |
| Events     | `createParticipant`: create error               | Upstream; mapper.                                              |
| Events     | `hasParticipant`: list error                    | Upstream; mapper.                                              |
| Events     | `updateParticipant`: update error               | Upstream; mapper (after local participant not-found handling). |
| Events     | `removeParticipant`: delete error               | Upstream; mapper (after local participant not-found handling). |
| Priorities | `remove`: Work task-list error                  | Upstream; mapper.                                              |

This is 22 upstream mappings and six local malformed-pagination guards.

## Logging

Ported the Work API Pino logger and request-context middleware into CRM API.
`requestContext` runs immediately after compression; startup config is in
`server.ts`; and the terminal error handler logs `unhandled_error` with the
real error name, message, and stack. CRM API now declares `pino@10.3.1` and
`pino-pretty@13.1.3`, matching Work API.

## Tests

| File                                                                              | `it()` cases added | Coverage                                                                                                                                                                                        |
| --------------------------------------------------------------------------------- | -----------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/crm-api/src/providers/work.error-mapping.test.ts`                           |                 16 | Every direct mapping, identity/internal fallbacks, unrecognized and code-less transport errors, `null`, `undefined`, and a missing message; full error objects and mapper logging are asserted. |
| `apps/crm-api/src/modules/reminders/reminders.values.advanced.test.ts`            |                  5 | The existing outage case was converted to the connection-scope case, then five more service cases were added. The resulting six service cases assert complete values and one exact Work call.   |
| `apps/crm-api/src/modules/reminders/__tests__/reminders.service.advanced.test.ts` |                  0 | Existing pagination-exhaustion case now pins `crm/work-invalid-response`.                                                                                                                       |
| `apps/crm-api/src/modules/tasks/__tests__/tasks.service.advanced.test.ts`         |                  0 | Existing pagination-exhaustion expectation updated to the local guard value.                                                                                                                    |

CRM test declarations moved from 687 to 708 (`+21`), and the CRM API Vitest
suite moved from an inferred 726 to 747 executed tests (`+21`).

## Verification

| Command                                | Result                              | Verbatim final line                                                                          |
| -------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm --filter @876/crm-api typecheck` | Passed                              | `✔ Generated Prisma Client (7.9.1) to ./src/db/generated/prisma in 284ms`                    |
| `pnpm --filter @876/crm-api lint`      | Passed with 9 pre-existing warnings | `✖ 9 problems (0 errors, 9 warnings)`                                                        |
| `pnpm --filter @876/crm-api test`      | Passed: 57 files, 747 tests         | `Duration  9.59s (transform 3.44s, setup 0ms, import 14.10s, tests 2.66s, environment 11ms)` |
| `pnpm --filter @876/core typecheck`    | Passed                              | `$ tsc --noEmit`                                                                             |
| `pnpm --filter @876/core test`         | Not passed                          | `Exit status 1`                                                                              |
| `pnpm --filter @876/crm typecheck`     | Passed                              | `$ tsc --noEmit`                                                                             |
| `pnpm --filter @876/crm test`          | Passed: 19 files, 227 tests         | `Duration  3.28s (transform 2.04s, setup 0ms, import 5.46s, tests 515ms, environment 3ms)`   |
| `npx prettier --write <changed files>` | Passed                              | `.claude/reports/codex/2026-08-30-crm-work-error-mapping.md 241ms`                           |
| Prohibited-pattern scan                | Passed; no output (exit 1)          | No output                                                                                    |

`@876/core` test is blocked by its existing exact-count assertion in
`packages/core/src/lib/errors/crm.catalog.advanced.test.ts`: it still expects
37 registered CRM errors, while this required registry addition yields 42. I
did not modify that test because the brief explicitly prohibits touching tests
outside `crm-api`.

No commit was created. No database operation, migration, or service startup
was performed.
