# Brief — the payment-methods and payment-intents HTTP modules

This is the **continuation** of
`.claude/briefs/codex/2026-08-23-billing-stripe-payment-plane.md`. Read that
brief in full: its Tasks 2, 3 and 4, its verification list, and its constraints
are this brief. Only the status has changed.

## Already landed on this branch — do not redo, do not modify

Task 1 is **complete**:

- `apps/billing-api/prisma/schema/` now has `payment-method.prisma`,
  `payment-credential.prisma`, `setup-intent.prisma`, `mandate.prisma`,
  `payment-intent.prisma`, `dispute.prisma`, `provider-reference.prisma`;
- `Payment`, `PaymentAttempt`, `enums.prisma`, `Tenant`, `Customer`, `Invoice`
  and `PaymentProviderConnection` are extended with the new fields and
  back-relations;
- the additive migration
  `prisma/migrations/20260823000000_billing_payment_instrument_plane/` exists and
  `db:validate` passes;
- `docs/billing/payment-instruments.md` exists.

**Read the generated Prisma client and those schema files first** — the field
names and enum values in the code are the contract, not the prose in the
original brief. Where the two disagree, the code wins.

Phase 1's sealing modules (`apps/billing-api/src/platform/secure-field.ts`,
`src/providers/workos/vault.ts`, `packages/core/src/crypto/secure-field.ts`) are
also complete and **must not be modified**. Use
`getSecureFieldProvider(tenantId, getVaultClient())` and `credentialContext(...)`.

## What is left — do exactly this

**Task 2** — the `payment-methods` module (routes, controller, service,
serializers, docs, repositories, schemas, tests), including the three-way
credential discriminated union, the detach-revokes-the-credential rule, the
single-default transaction, and the test asserting no PAN or ciphertext appears
in a serialized response.

**Task 3** — the `payment-intents` module and its state machine, including the
manual-method settlement path, the registered error on every illegal
transition, and idempotency on create through
`src/platform/idempotency.ts`.

**Task 4** — register both routers in `src/http/routes.ts`, run
`pnpm --filter @876/billing-api api:contract:generate`, and extend
`docs/billing/payment-instruments.md` with the routes as built.

## Budget

The previous run exhausted its budget on Task 1. Spend yours on the modules.
Do not re-read the whole schema directory, do not re-verify Task 1, and do not
re-derive the migration — read the specific models you need and write code.

## Verification — foreground, real output, all of them

```
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
```

`typecheck` fails on `packages/core/src/fetch/bridge.ts(154,50)` on `main` —
pre-existing, not yours, but run it and confirm no new error appears.

## Constraints

- Do not commit.
- Do not touch `apps/api`, `apps/console`, `packages/*`, or
  `apps/billing-api/prisma/` — another agent is working in `apps/api`,
  `packages/admin` and `apps/console` concurrently, and the schema is done.
- Do not add a reveal/decrypt route. `unseal` is called from nowhere in this
  change, and that is correct.
- No `cvc`/`cvv`/`cid`/`pin`/`track_data` field in any schema, fixture, or test.
