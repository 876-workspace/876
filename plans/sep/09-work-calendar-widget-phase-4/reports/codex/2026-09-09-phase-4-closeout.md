# Phase 4 closeout

Date: 2026-09-09

Branch: `feat/work-widget-phase-4`

Status: implemented and verified; ready for pull request.

## Outcome

- Invoice exposes contextual Work only through invoice-owned routes under
  `/api/invoices/:invoiceId/work`.
- Browser payloads no longer carry authoritative host identity. The Invoice BFF
  re-loads and authorizes the route invoice before injecting canonical context.
- The Work resource aggregate requires `tasks.view`, `reminders.view`, and
  `events.view` together for session access.
- Aggregate reads are concurrent, time-window bounded, explicitly paginated,
  and fail instead of silently truncating at the page ceiling.
- Contextual task creation writes the task, canonical primary link metadata,
  and primary assignment in one Prisma nested write.
- Context switching and late-response isolation are covered in browser tests;
  contextual create is covered through create and reload.

## Strict maintainability review

The thermo-nuclear review found no remaining Phase 4 blocker after remediation.
Its main effects on the final diff were:

- shared personal/context route behavior is owned by four focused Invoice route
  handlers instead of duplicated across every Next.js route;
- the browser transport is injected as a scoped client rather than teaching
  widgets about Invoice URL structure;
- the production event cast was removed by giving the canonical serializer an
  explicit `WorkEventResource` result;
- the pre-existing Work context and task-link contracts were extended instead
  of introducing another host-reference model;
- contextual task/link/assignment persistence is a single atomic repository
  operation.

## Verification

- `pnpm --filter @876/work typecheck` — passed
- `pnpm --filter @876/work lint` — passed
- `pnpm --filter @876/work test` — 23 files, 238 tests passed
- `pnpm --filter @876/work-api typecheck` — passed
- `pnpm --filter @876/work-api lint` — passed with two unrelated existing warnings
- `pnpm --filter @876/work-api test` — 26 files, 560 tests passed
- `pnpm --filter @876/work-api build` — passed
- `pnpm --filter @876/widgets typecheck` — passed
- `pnpm --filter @876/widgets test` — 16 files, 149 tests passed
- `pnpm --filter @876/widgets test:browser` — 7 files, 11 tests passed
- `pnpm --filter @876/invoice-app typecheck` — passed
- changed Invoice files ESLint — passed
- `pnpm --filter @876/invoice-app test` — 69 files, 477 tests passed
- `pnpm --filter @876/invoice-app build` — passed
- `pnpm --filter @876/api typecheck` — passed
- `pnpm --filter @876/api test` — 114 files, 2,267 tests passed
- `pnpm check:transpile` — passed
- `pnpm check:service-bundle` — passed
- `git diff --check` — passed

The repository-wide Invoice lint command remains red on 11 errors in unchanged
customer/item/quote files. All Invoice files changed by Phase 4 pass ESLint.

## Deferred scope

Customer, CRM, Couriers, provider sync, full assignment/delegation UI, and a
standalone Work application remain outside the Invoice pilot and are not
claimed as Phase 4 deliverables.
