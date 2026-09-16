# Quote integration boundary

## Changed files

- `apps/api/src/modules/oauth/oauth.scopes.ts` declares
  `billing.quotes.read` and `billing.quotes.write` with the existing Billing
  scope wording.
- `apps/billing-api/src/modules/documents/documents.routes.ts` adds guarded,
  route-local quote list/create/retrieve integration endpoints.
- `apps/billing-api/src/modules/documents/documents.controller.ts` routes all
  three endpoints to the existing quote service operations. No Prisma access or
  quote business implementation was added.
- `apps/billing-api/src/modules/documents/schemas/quote.ts` exports the
  integration create contract.
- `apps/billing-api/src/modules/documents/__tests__/quotes.integration-routes.test.ts`
  adds assembled Express/Supertest route and authorization coverage.
- `packages/billing/src/integration/resources/quotes.ts` adds the `list`,
  `retrieve`, and `create` resource client, with client/type/schema wiring
  beneath `packages/billing/src/integration/`.
- `packages/billing/src/integration/resources/__tests__/quotes.integration.test.ts`
  verifies the three integration-client resource methods.
- `apps/billing/contracts/v1/openapi.json` and
  `apps/billing-api/src/http/openapi/v1-contract.generated.ts` were regenerated
  by `pnpm --filter @876/billing-api api:contract:generate`; they include the
  three public integration operations.

## Tests

There are **14 new `it()` cases**: 11 route/auth cases and 3 client-resource
cases. The route cases run through `createApp()` and Supertest. They cover all
three valid routes, missing/other-resource scopes, unknown-path 404 behavior,
organization isolation for all three operations, the quote discriminator, and
the standard list envelope.

Focused verification passed before the workspace's concurrent lockfile drift:

```text
$ pnpm --filter @876/billing-api exec vitest run src/modules/documents/__tests__/quotes.integration-routes.test.ts

 RUN  v4.1.11 /root/projects/876/apps/billing-api

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  04:50:50
   Duration  22.59s (transform 12.76s, setup 552ms, import 17.53s, tests 3.70s, environment 0ms)

$ pnpm --filter @876/billing exec vitest run src/integration/resources/__tests__/quotes.integration.test.ts

 RUN  v4.1.11 /root/projects/876/packages/billing

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  04:51:32
   Duration  1.62s (transform 637ms, setup 0ms, import 1.04s, tests 164ms, environment 0ms)
```

## Schema decision

`IntegrationInvoiceCreateSchema` is distinct because invoice integrations accept
`sourceExternalReference`, then the controller builds idempotency/source
attribution and supplies it to the already-attribution-aware invoice service.
Quotes have no attribution/idempotency service contract or persistence path.
`IntegrationQuoteCreateSchema` is therefore deliberately the same strict quote
shape: accepting an invoice-only source reference and silently dropping it
would be a false contract. The controller calls the existing `listQuotes`,
`getQuote`, and `createQuote` operations exactly once.

The brief did not settle quote idempotency semantics. The integration client
matches the invoices resource shape and sends its required idempotency header,
but this change does not add replay/attribution behavior to quote creation.

## Verification output

The OpenAPI contract was regenerated:

```text
$ pnpm --filter @876/billing-api api:contract:generate
$ tsx scripts/generate_v1_openapi_snapshot.ts && tsx scripts/generate_v1_contract_manifest.ts
Regenerated the frozen Billing v1 OpenAPI contract.
Generated Billing v1 compatibility manifest.
```

These type checks completed successfully before a concurrent workspace change
made pnpm's frozen-lockfile guard fail:

```text
$ pnpm --filter @876/billing-api typecheck
$ tsc --noEmit

$ pnpm --filter @876/billing typecheck
$ tsc --noEmit

$ pnpm --filter @876/api typecheck
$ tsc --noEmit
```

The requested Billing lint command completed with existing warnings and no
errors:

```text
$ pnpm --filter @876/billing-api lint
$ eslint src
Pages directory cannot be found at /root/projects/876/apps/billing-api/pages or /root/projects/876/apps/billing-api/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.

/root/projects/876/apps/billing-api/src/http/errors.ts
  35:20  warning  '_writer' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/billing-api/src/providers/accounting/zoho-books/errors.ts
  38:3  warning  '_providerCode' is defined but never used     @typescript-eslint/no-unused-vars
  39:3  warning  '_providerMessage' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)
```

After the concurrently modified `packages/billing-ui/package.json` no longer
matched `pnpm-lock.yaml`, the remaining requested pnpm commands could not run.
This is their verbatim failure output (the same output occurred for
`boundaries`, both full Billing tests, and both requested API commands):

```text
Scope: all 44 workspace projects
[ERR_PNPM_OUTDATED_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/packages/billing-ui/package.json

Note that in CI environments this setting is true by default. If you still need to run install in such cases, use "pnpm install --no-frozen-lockfile"

  Failure reason:
  specifiers in the lockfile don't match specifiers in package.json:
* 1 dependencies were added: @876/core@workspace:*

[ERROR] Command failed with exit code 1: /root/.local/share/fnm/node-versions/v22.23.2/installation/bin/node /root/.cache/node/corepack/v1/pnpm/11.3.0/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /root/.local/share/fnm/node-versions/v22.23.2/installation/bin/node /root/.cache/node/corepack/v1/pnpm/11.3.0/bin/pnpm.mjs install
```

I additionally ran the locally installed TypeScript compiler directly after
formatting; it completed with exit 0 for Billing API, Billing, and API. I did
not alter the unrelated lockfile or another agent's `billing-ui` manifest.

The global Billing auth-matrix test also has a hard-coded pre-change public
operation count (213). With the three new quote routes it expects 213 but sees
216. Its file is outside the task's allowed scope, so I did not modify it.

## Authorization note

This code declares and enforces the scopes, but it does **not** grant them to
Invoice. Invoice still requires a provisioning-profile data revision that grants
`billing.quotes.read` and `billing.quotes.write` to its connection.
