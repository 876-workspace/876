# Brief: verify and repair `feature/invoice-lifecycle-hardening`

You are on branch `feature/invoice-lifecycle-hardening` in `/root/projects/876`.
This branch was written entirely by GPT Web, which **cannot execute anything** —
no typecheck, no lint, no test, no build has ever been run against it. Every
green check is yours to produce.

Read first:

- `plans/2026-09-07-invoice-lifecycle-hardening/plan.md` (scope, invariants, decisions)
- `plans/2026-09-07-invoice-lifecycle-hardening/reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md`
- `.agents/rules/ai-code-quality.md`, `.agents/rules/testing.md`,
  `.agents/rules/error-handling.md`, `.agents/rules/express-api.md`,
  `.agents/rules/sdk-conventions.md`, `.agents/rules/shared-product-ui.md`,
  `.agents/rules/billing-commercial-platform.md`

## Your job

Run every verification command below **in the foreground**, in this order, and
fix every concrete failure. Do not stop at the first failing package — work
through all of them.

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
```

If a package script does not exist, say so in your report rather than inventing
one. `db:drift` needs a live database — skip it and record that it was skipped.

## Hard constraints

- **Do not commit.** The orchestrator stages and commits. Leave your work in the
  working tree.
- **Do not create, rename, delete, merge, rebase, or push any branch.** Another
  agent (GPT Web) may still be pushing to this same branch. Do not `git pull`,
  do not `git push`, do not touch `main`.
- **No `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`, no `as any`.**
  `as unknown as T` only for a genuine external/library mismatch, and justify it
  in your report. The branch is currently clean of all of these — keep it that way.
- **Do not weaken production code to make a test pass.** Do not loosen a
  signature, make a required prop optional, or delete an assertion. If a test is
  wrong, fix the test; if the implementation is wrong, fix the implementation.
  Say which you concluded and why.
- **Do not run `prisma migrate` or any generator that writes migrations.**
  `prisma generate` is fine and may be required before typecheck.
- Do not redirect your stdout to any file inside the repository.

## Known-likely failure modes on GPT-Web output

Look for these specifically — they have all shipped from that seat before:

1. **Stale generated Prisma client** causing a wall of typecheck errors. Run
   `pnpm --filter @876/billing-api exec prisma generate` (or the package's own
   `db:generate` script) before concluding a type error is real.
2. **Tests written for the wrong vitest environment** — check each package's
   `vitest.config.ts` before assuming a component test could ever have run.
   `packages/billing-ui` gained a brand-new suite
   (`src/invoice-lifecycle-actions.test.tsx`) and a changed `package.json`;
   confirm the test deps and environment actually exist.
3. **`mockResolvedValueOnce` queues that are never consumed** and leak into the
   next test — `clearMocks` does not drain the once-queue.
4. **Fixtures using a frozen `NOW` constant while the clock is never frozen** —
   very likely here, because this branch is full of due-date/overdue logic.
   `apps/billing-api/src/modules/documents/workflows/invoice-workflows.test.ts`
   is the file to read carefully.
5. **BigInt literals the ES target rejects**, and minor-unit arithmetic silently
   done in `number`.
6. **A module cycle** — the plan claims Customers deliberately keeps a local
   status predicate to avoid a Documents→Customers→Documents cycle. `boundaries`
   is the check that proves it.

## Test counts to confirm

The plan claims 28 new literal `it()` declarations. Count them and report the
real number per file. A count that does not match is a finding, not a rounding
error.

## Substantive review, after the checks are green

Once everything passes, review the diff against `origin/main` for:

- duplicate lifecycle logic that should have been centralized in
  `apps/billing-api/src/modules/documents/invoice-lifecycle.ts` but was not;
- the overdue-vs-partially-paid precedence actually matching the documented
  projection (`amountDue = 0 → PAID`; positive balance past `dueAt` → `OVERDUE`;
  else cash/credit applied → `PARTIALLY_PAID`; else `sentAt` → `SENT`; else `OPEN`);
- repeated `send` genuinely preserving the first `sentAt` while still emitting a
  fresh `invoice.sent` event;
- `void` rejecting written-off, non-collectible, and settled invoices;
- write-off using `amountWrittenOff` + `UNCOLLECTIBLE` + `WRITE_OFF` ledger
  evidence, kept distinct from cash and credit;
- financial mutations staying inside a transaction;
- route handlers holding no business logic;
- `packages/billing-ui/src/invoice-lifecycle-actions.tsx` importing no service
  client, no session, no routing — it must take props and callbacks only
  (`shared-product-ui.md`);
- both host adapters (`apps/billing/...` and `apps/invoice/...`) being genuinely
  thin, with no forked copy of the shared component.

Fix what is clearly wrong and small. For anything larger or ambiguous, leave it
and write it up as a finding — do not expand scope on your own judgement.

## Report

Write `plans/2026-09-07-invoice-lifecycle-hardening/reports/codex/2026-09-08-verification-and-repair.md`
containing:

- a table of every command run, with its real pass/fail result;
- every failure you found, the root cause, and exactly what you changed;
- the counted `it()` totals per file;
- anything you skipped and why;
- findings you did not fix, with file:line;
- an explicit statement of anything you could not verify.

Be honest about failures. A truthful "this still fails" is worth far more than
a repair that only silences the symptom.
