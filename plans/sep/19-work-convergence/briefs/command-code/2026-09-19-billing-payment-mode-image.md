# Fix the two failing payment.schema tests in `packages/billing`

Branch `refactor/work-convergence`. Do **not** commit, branch, or open a PR.
Do **not** run any database command. Scope: `packages/billing` and, if the
server is the wrong side, `apps/billing-api`. Nothing else.

## The failure

```
pnpm --filter @876/billing test
FAIL src/types/__tests__/payment.schema.test.ts > PaymentSchema
  > accepts partially refunded payments with cumulative refund evidence
  > accepts a fully refunded payment status
ZodError: paymentMode.imageFileId — expected string, received undefined
        paymentMode.imageUrl    — expected string, received undefined
```

These two fail on this branch **and on its base commit**, so they are a
pre-existing defect, not fallout from recent work. The schema requires two
fields the test fixture omits.

## What to decide, and how

Exactly one of these is wrong, and the **server is authoritative**:

- the Zod contract in `packages/billing/src/types/payment.schema.ts`, or
- the fixture in `packages/billing/src/types/__tests__/payment.schema.test.ts`.

Find the server's payment-mode serializer in `apps/billing-api` (grep for
`imageFileId` and `image_file_id` under `apps/billing-api/src`) and read what
it actually emits. Then:

- **If the server can emit a payment mode with no image** — because the column
  is nullable, or the serializer emits `null`, or the field is conditional —
  the schema is wrong. Make `imageFileId` and `imageUrl` match exactly what the
  server emits (`.nullable()`, `.optional()`, or both — do not guess; mirror
  the serializer). Leave the fixture alone.
- **If the server always emits both as strings**, the fixture is wrong. Add the
  two fields to it with realistic values, not `'test'` or `'foo'`.

Report which side was wrong and quote the serializer line that decided it.

## Rules

- Read `.claude/rules/stripe-api-pattern.md` and
  `.claude/rules/error-handling.md` before changing a contract.
- Do **not** rename any existing wire field or change its spelling — an
  existing v1 contract is durable (`.claude/rules/naming.md`).
- No `eslint-disable`, `@ts-ignore`, `as any`. No `.passthrough()` or
  `.optional()` sprayed over unrelated fields to make a test pass.
- Do not touch any other test, file, or package.

## Verify, in the foreground, one at a time

```
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test          # expect 443 passed, 0 failed
pnpm --filter @876/billing-api typecheck # only if you changed that workspace
```

The billing-api suite has 5 pre-existing failures in
`documents.service.assessLateFees` / `documents.service.chaos`. They are not
yours — do not fix them, and do not report them as your result.

## Report

Write `plans/sep/19-work-convergence/reports/command-code/2026-09-19-billing-payment-mode-image.md`:
which side was wrong and the serializer evidence; the exact diff; the verify
output with counts; anything you could not verify.
