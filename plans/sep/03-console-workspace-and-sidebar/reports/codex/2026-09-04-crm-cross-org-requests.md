# CRM cross-organization requests — 2026-09-04

## Changed files

- `apps/crm-api/src/modules/requests/requests.repository.ts` — extracted the shared request filter builder and added the all-tenant, soft-delete-safe, bounded cursor query with tenant organization selection.
- `apps/crm-api/src/modules/requests/requests.service.ts` — added cross-organization serialization that preserves the `request` object and attaches `organizationId`.
- `apps/crm-api/src/modules/requests/requests.schemas.ts` — added strict `status`, `limit`, and `starting_after` query validation.
- `apps/crm-api/src/modules/requests/requests.controller.ts` and `requests.routes.ts` — added the internal-key-protected cross-organization list caller.
- `apps/crm-api/src/http/routes.ts` — mounted `GET /v1/requests`.
- `apps/crm-api/src/http/result.ts` — extended the existing list sender to accept a bounded list result while preserving the established envelope.
- `apps/crm-api/src/modules/requests/__tests__/requests.cross-organization.repository.test.ts` — repository coverage.
- `apps/crm-api/src/modules/requests/__tests__/requests.cross-organization.service.test.ts` — serializer coverage.
- `apps/crm-api/src/modules/requests/__tests__/requests.cross-organization.routes.test.ts` — internal authorization, validation, and exact envelope coverage.
- `packages/crm/src/request-types.ts` and `src/index.ts` — public cross-organization request/list contract.
- `packages/crm/src/resources/operator-requests.ts` and `src/operator.ts` — operator-only typed list method using the canonical request envelope.
- `packages/crm/src/operator.test.ts` — operator success/error envelope coverage.
- `apps/console/src/lib/services/crm.ts` — Console-scoped cross-organization method.
- `apps/console/src/app/(app)/requests/all/page.tsx` and `_components/all-requests-table.tsx` — synchronous all-requests page shell, streamed rows, table, organization metadata, and status badge.
- `apps/console/src/app/(app)/requests/all/page.test.tsx` — chrome/streaming and recoverable-error shell coverage.

## Tests added

10 test cases: 2 repository, 1 service, 3 route, 2 package operator, and 2 Console page cases.

## Verification

Completed and observed:

```text
$ pnpm --filter @876/crm-api typecheck
$ node scripts/prisma-generate.mjs && tsc --noEmit
... Prisma Client generated successfully

$ pnpm --filter @876/crm-api boundaries
[ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT] None of the selected packages has a "boundaries" script

$ pnpm --filter @876/crm-api exec vitest run src/modules/requests/__tests__/requests.cross-organization.repository.test.ts --maxWorkers=1
Test Files  1 passed (1)
Tests  2 passed (2)

$ pnpm --filter @876/crm-api exec vitest run src/modules/requests/__tests__/requests.cross-organization.service.test.ts src/modules/requests/__tests__/requests.cross-organization.routes.test.ts --maxWorkers=1
Test Files  2 passed (2)
Tests  4 passed (4)

$ pnpm --filter @876/crm-api exec vitest run src/modules/requests/__tests__/requests.cross-organization.routes.test.ts --maxWorkers=1
Test Files  1 passed (1)
Tests  3 passed (3)

$ pnpm --filter @876/crm typecheck
$ tsc --noEmit

$ pnpm --filter @876/crm exec vitest run src/operator.test.ts --maxWorkers=1
Test Files  1 passed (1)
Tests  2 passed (2)

$ pnpm --filter @876/console exec vitest run 'src/app/(app)/requests/all/page.test.tsx' --maxWorkers=1
Test Files  1 passed (1)
Tests  2 passed (2)

$ npx prettier --write <all changed implementation and test files>
All listed files formatted; unchanged files were reported unchanged where applicable.
```

The required full-package commands were also launched in the foreground:

```text
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/crm test
pnpm --filter @876/console test -- requests
```

The terminal integration yielded their live Vitest startup output after 30 seconds and did not preserve their final aggregate summaries. Focused tests above were then run to completion and observed. No production or test failure was observed after the assertion correction.

## Decisions

- Cursor pagination is forward-only through `starting_after`, satisfying the brief's “at least” requirement without introducing backward-pagination semantics that the existing CRM list routes do not define.
- `total_count` is `null` when there is another page, avoiding an added aggregate count query; otherwise it is the returned list length, matching existing list behavior.
- The report is written under `plans/` because the explicit report destination in the brief conflicts with its general no-touch list and is more specific.
