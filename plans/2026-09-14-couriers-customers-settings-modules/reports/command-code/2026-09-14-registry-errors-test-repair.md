# Brief G2 — registry errors test repair

## Outcome

41 of the 42 failing Couriers tests are repaired. One assertion is left failing on purpose: it
exposes a real platform status regression introduced by the registry migration
(`organization/provider-conflict` is registered as 502 instead of 409). Details in
[Status regressions](#status-regressions-step-4) below.

## Files changed and assertions updated (per file)

| File | Failing before | Assertions updated | Notes |
| --- | --- | --- | --- |
| `apps/couriers/src/app/api/manage/customers/[id]/route.test.ts` | 1 | 1 | `customer/not-found` body now normalized through the registry; `couriersErrorStatus` expectation flipped to `not.toHaveBeenCalled()`; test renamed accordingly. |
| `apps/couriers/src/app/api/manage/customers/route.test.ts` | 1 | 1 | `auth/no-session` message via `getError(...)`. |
| `apps/couriers/src/app/api/manage/onboarding/organization/route.test.ts` | 9 | 8 | See status table; `organization/provider-conflict` case left failing (step 4). |
| `apps/couriers/src/app/api/manage/roles/[id]/route.test.ts` | 1 | 1 | `auth/no-session` message. |
| `apps/couriers/src/app/api/manage/roles/route.test.ts` | 3 | 3 | `auth/no-session`, `auth/forbidden`, `request/invalid` messages. |
| `apps/couriers/src/app/api/manage/settings/orglogo/complete/route.test.ts` | 2 | 2 | `auth/no-session` message; platform `organization/not-found` now 404. |
| `apps/couriers/src/app/api/manage/settings/orglogo/route.test.ts` | 2 | 2 | `auth/no-session`, `storage/forbidden` messages. |
| `apps/couriers/src/app/api/manage/settings/orgprofile/route.test.ts` | 2 | 2 | `auth/no-session` message; platform `organization/not-found` now 404. |
| `apps/couriers/src/app/api/manage/team/[id]/route.test.ts` | 1 | 1 | `auth/forbidden` message. |
| `apps/couriers/src/app/api/manage/team/invites/[inviteId]/route.test.ts` | 2 | 2 | `auth/forbidden` message; revoke `invite/not_found` now 404. |
| `apps/couriers/src/app/api/manage/team/invites/route.test.ts` | 3 | 3 | `auth/no-session`, `auth/forbidden` messages; `invite/rate_limited` now 429. |
| `apps/couriers/src/app/api/portal/packages/route.test.ts` | 4 | 4 | Registered portal codes replace `error/not-found`, `auth/forbidden`, `error/unknown`; `auth/no-session` message. |
| `apps/couriers/src/lib/api-envelope-routes.test.ts` | 11 | guard change | Recognises `errorResponse(...)`, `invalidRequest(...)`, `resultResponse(...)` as envelope helpers; still forbids `NextResponse.json(`/`Response.json(` and now also literal `apiJson({ error: ... })`. |

Messages are imported through `getError('<code>').message` from `@/lib/errors`; bodies assert whole
objects with `toEqual`, statuses and mock call counts stay exact. No test was deleted or skipped.
`npx prettier --write` was applied to the onboarding test file (formatting only).

Code changes in route responses that are not status changes: `auth/session-invalid` →
`auth/invalid-session` (401 unchanged) in the onboarding organization route; portal codes
`portal/unavailable`, `portal/enrollment-required`, `portal/packages-unavailable` (statuses
unchanged).

## Status regressions (step 4)

| File | Code | Old status | New status | Verdict |
| --- | --- | --- | --- | --- |
| `apps/couriers/src/app/api/manage/onboarding/organization/route.test.ts` | `organization/provider-conflict` | 409 | 502 | **Regression — test left unchanged and failing.** |

Evidence that 502 is wrong for this code:

- `apps/api/src/providers/workos/errors.ts` maps `external_id_already_used` →
  `['organization/provider-conflict', 409]`, and documents that the shared registry's status wins
  once a code is registered. `AppHttpError` (`apps/api/src/platform/errors.ts:47-56`) now resolves
  the newly added core entry, so the API's WorkOS conflict response silently changed 409 → 502 as
  well.
- `apps/billing/src/app/api/onboarding/organization/route.ts` (still unmigrated) lists the code in
  `ORGANIZATION_CONFLICT_CODES` and answers 409.
- The pre-migration Couriers route had the same conflict set (`git diff` of the route), and the
  code's own name is `conflict`.

Fix belongs outside this brief's file scope: set `httpStatus: HttpStatus.CONFLICT` for
`organization/provider-conflict` in `packages/core/src/lib/errors/organizations.ts`. That makes the
test pass with no test edit.

### Status changes accepted as registered definitions (not regressions)

These replaced literal route statuses with the registry's definition for the same code; all match
the platform catalogs and are semantically the code's own status, so the expectations were updated:

| File | Code | Old | New |
| --- | --- | --- | --- |
| onboarding/organization | `onboarding/verification-failed` | 500 | 502 |
| onboarding/organization | `provider/unavailable` (retry case) | 500 | 502 |
| onboarding/organization | `onboarding/invalid-answers` | 500 | 422 |
| settings/orglogo/complete | `organization/not-found` | 502 | 404 |
| settings/orgprofile | `organization/not-found` | 502 | 404 |
| team/invites/[inviteId] | `invite/not_found` | 502 | 404 |
| team/invites | `invite/rate_limited` | 502 | 429 |

## Verification

- Per-file runs: 12 of 13 files fully pass; `onboarding/organization` has exactly the one
  step-4 regression case failing (14 passed, 1 failed).
- `pnpm --filter @876/couriers-app typecheck` — passed.
- `npx prettier --check` on all changed files — passed after formatting the onboarding test.
- `npx eslint` on all changed files — passed with no output.
- Full suite, run once on the final tree:

```
 Test Files  1 failed | 123 passed (124)
      Tests  1 failed | 1097 passed (1098)
```

The single remaining failure is
`Couriers onboarding organization route > returns 409 and preserves the organization/provider-conflict platform error`
(502 received, 409 expected), the regression listed above.
