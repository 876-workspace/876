# Phase 6d (rows 1–3) — route quote creation at the integration principal

Branch: `feature/finance-apps`. Do not create, switch, merge, or rebase a
branch. Do not commit — the orchestrator stages and commits.

## Why this exists

876 Invoice reaches Billing through the **integration** boundary:
`apps/invoice/src/lib/api/resource-proxy.ts:48` builds
`/integrations/organizations/:organizationId/<resource>/...`.

Billing defines that boundary for **invoices only**
(`apps/billing-api/src/modules/documents/documents.routes.ts:428`). Quotes have
a tenant route (`POST /api/v1/quotes`) and no integration counterpart, so
Invoice cannot create a quote at all.

`.claude/rules/access-tiers.md` is explicit about the correct fix: *a capability
is implemented once by the service that owns it and may be routed at multiple
legitimate principals. Principal-specific routes change authentication, scope
checks, serializers and auditing — not the underlying business implementation.*

So: **add the integration routes. Do not add a second quote-creation
implementation.** The documents service already creates quotes; the new routes
call the same service function the tenant routes call.

## Rules to read first

- `.claude/rules/access-tiers.md` — the capability/principal rule above
- `.claude/rules/express-api.md` — module layering, guards attach per route
- `.claude/rules/stripe-api-pattern.md` — envelopes, `object` discriminators
- `.claude/rules/sdk-conventions.md` — resource verbs, caller entrypoints
- `.claude/rules/ai-code-quality.md`
- `.claude/rules/testing.md`

## Scope — these files and no others

```
apps/api/src/modules/oauth/oauth.scopes.ts
apps/billing-api/src/modules/documents/documents.routes.ts
apps/billing-api/src/modules/documents/documents.controller.ts
apps/billing-api/src/modules/documents/schemas/quote.ts
apps/billing-api/src/modules/documents/__tests__/**
packages/billing/src/integration/resources/quotes.ts        (new)
packages/billing/src/integration/**                          (wiring + tests)
```

Do **not** touch `apps/invoice/**`, `apps/billing/**`, `packages/billing-ui/**`,
or `packages/core/**`. Two other agents are working in `apps/invoice` and
`apps/billing` right now. The Invoice half of this feature is deliberately not
in this task.

## The reference to copy

`documents.routes.ts:428-519` is the invoices integration block: a `base`
const, an `integrationRead`/`integrationWrite` security pair, and `api.get` /
`api.post` declarations. `documents.controller.ts:50-160` holds the matching
`invoicesIntegration*` controller methods.

**Mirror that block for quotes.** Read both fully before writing.

## What to do

1. **Declare the scopes** in `apps/api/src/modules/oauth/oauth.scopes.ts`:
   `billing.quotes.read` and `billing.quotes.write`, following the exact shape
   of the neighbouring `billing.invoices.*` entries (line 77 onward). Match
   their description style.

2. **Add the integration routes** in `documents.routes.ts`, base
   `/integrations/organizations/:organizationId/quotes`, guarded by
   `{ kind: 'integration', scope: 'billing.quotes.read' | '...write' }`:
   - `GET  <base>` — list an organization's quotes
   - `POST <base>` — create one
   - `GET  <base>/:quoteId` — retrieve one

   Attach the guard **per route**, never with `router.use` — an unknown path
   must still 404 rather than 401 (`express-api.md`).

3. **Add the matching controller methods**
   (`quotesIntegrationList` / `quotesIntegrationCreate` / `quotesIntegrationGet`)
   mirroring the invoice ones. A controller reads validated input, calls **one**
   service operation, and picks the status. **It must not touch Prisma and must
   not contain business rules.**

4. **Add the request schema** beside the existing quote schemas. If the invoice
   side has an `Integration*CreateSchema` variant distinct from its tenant one
   (see `schemas/invoice.ts:93`, `invoiceCreateSchema(true)`), follow the same
   pattern for quotes rather than reusing the tenant schema blindly — read why
   the flag exists first and say what you found.

5. **Add `packages/billing/src/integration/resources/quotes.ts`** with `list`,
   `retrieve` and `create`, mirroring
   `packages/billing/src/integration/resources/invoices.ts` exactly in shape,
   and wire it into the integration client the same way invoices is wired.
   Verbs are the standard vocabulary (`sdk-conventions.md`): `list`,
   `retrieve`, `create` — not `get`, not `fetch`.

## What must stay true

- The organization is taken from the validated route params and the connection
  identity — **never** from a client-supplied body field.
- A caller whose connection lacks the scope is refused. Fail closed.
- No new quote-creation business logic anywhere; the existing service call is
  reused.
- The tenant routes' behaviour is unchanged.

## Verification (run these; report the real output)

```
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
```

If the repo regenerates an OpenAPI contract snapshot, regenerate it and say so.

## Hard prohibitions

- No `eslint-disable`, no `@ts-ignore`, no `as any` (`as unknown as T` only for
  a genuine external mismatch, and say so in the report).
- Do not weaken a guard, widen a scope, or make a route public to get a test
  passing.
- Do not carry a money value as a JS `number`.
- Do not commit. Do not touch `main`.
- If a premise here is false, stop that step and report it rather than
  inventing a contract.

## Tests — floor is 14 new `it()` cases

Route/auth tests must exercise the assembled Express middleware with Supertest
(`api-backend.md`), not call controllers directly. Cover at minimum: each of the
three routes with a valid scope; each refused without it; refused with the
*other* resource's scope (an `billing.invoices.write` connection must not create
a quote); an unknown sub-path 404s rather than 401s; organization isolation — a
connection for org A cannot read or create against org B; the created resource
carries the `quote` object discriminator; the list response is the standard list
envelope.

Count the cases and state the number.

## Report

Write `plans/2026-09-06-finance-apps-foundation/reports/codex/2026-09-06-quotes-integration-boundary.md`:
files changed and why, the counted new test number, verification output
verbatim, what you found about the integration-vs-tenant schema flag, decisions
the brief did not settle, and anything you could not verify.

Note for the report: the scope still has to be **granted** to Invoice through a
provisioning-profile revision, which is data rather than code. State plainly
that your change does not by itself authorize Invoice.
