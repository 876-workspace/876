# Quote lifecycle review and PR handoff

Reviewed `feature/quote-lifecycle-hardening` against fetched `origin/main` at `fdb78ba8f` on 2026-09-08. The branch already contains that base through its merge commit; the original report's rebase warning is superseded.

## Findings addressed

- High — failed lifecycle validation returned an error value from a transaction after claiming an idempotency key, committing an unfinished claim. Domain failures now throw through the transaction and become the existing service error result after rollback. Regression tests exercise the real workflow and repository transaction boundary.
- High — edit/delete checked draft status before an unconditional write. Conditional writes now require the tenant, draft status, and an unexpired proposal at mutation time, preventing stale requests from changing historical quotes.
- High — concurrent invoice insertion raised a uniqueness error that the repository converted to 500, bypassing the service's 409 recovery. The canonical invoice creator now resolves a winning quote-backed invoice directly; other failures remain errors.
- High — integration conversion dropped app attribution, so Invoice could create a draft and then receive 404 from its app-scoped invoice read. Integration acceptance and conversion now preserve attribution, including automatic conversion. Conversion hashes include quote identity to distinguish otherwise empty command bodies.
- Medium — the shared UI could not invoke the supported SENT-to-SENT resend transition. Resend is now available in the overflow menu, with duplicate invoice actions removed and mutation controls disabled during pending work.
- Medium — generated API contracts, route authentication counts, Billing's route inventory, and the quote settings catalog test did not cover the added surfaces. The existing pending corrections were reviewed and completed.

The maintainability review removed the unused legacy quote transition writer and reused the quote conversion enum in the route schema. No replacement conversion implementation, new settings table, or invoice status was introduced. Incidental formatting changes outside the quote branch were removed.

## Verification

- Billing SDK: 323 tests passed; typecheck passed.
- Shared Billing UI: 398 tests passed; typecheck passed.
- Billing app: 859 tests passed; typecheck passed.
- Invoice app: 392 tests passed; typecheck passed.
- Billing API: 77 files / 708 tests passed with `--maxWorkers=2`; typecheck, boundaries, API contract checks, and lint passed (three existing lint warnings).
- API contract comparison: 280 frozen and implemented operations, with no metadata/schema/status mismatches.
- Prisma schema validation passed.
- Changed-file formatting and diff whitespace checks are performed before handoff.

The repository-wide `pnpm check` stopped at formatting with 420 reported files. This includes substantial unrelated baseline formatting debt; it does not establish a green monorepo check. One API late-fee test and one Billing navigation test timed out under concurrent suite load; both passed on rerun with reduced contention.

## Release gates and limits

- Read-only database drift inspection found missing quote `sent_at`/`expired_at` columns and upstream command-idempotency/outbox tables, plus unrelated enum/default/index drift. No migration was applied. Reconcile the intended deployment database and apply the existing migrations through its deployment workflow before releasing these endpoints.
- The quote timestamp migration is additive and nullable. No backfill changes existing quote decisions.
- Acceptance and automatic draft conversion remain separate transactions; retrying acceptance repairs a failed conversion. This is documented behavior.
- Browser/manual verification and hosted CI/review gates remain outstanding. No build was run.
- No new commit or PR attribution was added. Existing branch commit messages were checked for AI attribution and none was found.

## Proposed PR

Title: `feat(billing): harden quote decisions and draft invoice conversion`

Base: `main`. Head: `feature/quote-lifecycle-hardening`.

The ready-to-use description is in [pr-description.md](pr-description.md). Keep the remaining changes in focused commits for transactional quote guards, conversion ownership/replay, shared action UI, contract synchronization, and documentation. The repository git rule requires explicit commit approval before committing these local changes.
