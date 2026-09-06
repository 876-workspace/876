# Invoice document create routes — blocked

## Status

No production or test files were changed by this task. The requested Invoice
quote create flow cannot be implemented without adding an unsupported backend
integration route, which is outside this task's permitted files and
contradicts the stated integration premise.

## Blocking evidence

Invoice's registered-resource proxy always constructs this Billing path:

```text
/api/v1/integrations/organizations/:organizationId/<resource>/...
```

This is implemented by `apps/invoice/src/lib/api/resource-proxy.ts`. The
existing invoice proxy therefore targets
`/integrations/organizations/:organizationId/invoices`, which Billing defines
in `apps/billing-api/src/modules/documents/documents.routes.ts:428-519`.

There is no corresponding
`/integrations/organizations/:organizationId/quotes` route anywhere in
`apps/billing-api/src`. Registering `quotes` and copying the invoices catch-all
route as requested would expose `/api/quotes`, but every request would be
forwarded to that missing integration endpoint and fail (rather than reach the
tenant route). Creating the integration route, its controller/service scope,
and integration SDK surface is outside the allowed file list.

## Quote create contract found

The tenant endpoint does exist:

```text
POST /api/v1/quotes
operationId: billing-billing_post_quotes
security: tenant sales:write
```

`QuoteCreateSchema` is a strict object with:

- `customerId`: required non-empty ID
- `priceListId`: optional nullable ID
- `currency`: optional currency code
- `issueAt`, `expiresAt`: optional Unix-second timestamps
- `notes`, `terms`: optional nullable text
- `lines`: required array of 1–100 `DocumentLineCreateSchema` values

Each line is a strict object with optional nullable `itemId`, optional nullable
`priceId`, optional nullable non-empty `description`, `quantity` as an integer
from 1 to 1,000,000 (default 1), optional nullable minor-unit `unitAmount`,
and optional minor-unit `taxAmount` and `discountAmount`. The response resource
is `{ object: 'quote', id: string }` (under the API success envelope).

The contract is materially unsuitable for the required Invoice browser proxy
only because it has no integration route/guard/scope counterpart. I did not
invent one, bypass Invoice's integration boundary, or add a proxy known to 404.

## Files changed and why

- This report only — records the blocker and the inspected contract.

## Tests

New `it()` cases: **0**. The requested floor of 12 cannot truthfully be met
without a working quote mutation boundary. No partial form was added because
its quote variant would be nonfunctional.

## Decisions not settled by the brief

- Whether Billing should add an organization-scoped quote integration resource
  (recommended for parity with Invoice's existing proxy architecture), including
  its read/write scopes and idempotency behavior.
- Whether Invoice should instead use a distinct, explicitly authorized tenant
  route. That would contradict the verified premise that Invoice reaches Billing
  through `@876/billing/integration` and would require an architecture decision.

## Verification output (verbatim)

`pnpm --filter @876/billing typecheck`

```text
$ tsc --noEmit
src/settings-catalog.test.ts(102,62): error TS2345: Argument of type '"subscriptions" | "price-lists" | "purchases" | "banking" | "payroll" | "credit-notes" | "discounts"' is not assignable to parameter of type '"invoices" | "quotes" | "customers" | "items" | "sales-receipts" | "payments" | "expenses" | "time-tracking"'.
  Type '"subscriptions"' is not assignable to type '"invoices" | "quotes" | "customers" | "items" | "sales-receipts" | "payments" | "expenses" | "time-tracking"'.
/root/projects/876/packages/billing:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/billing@0.1.0 typecheck: `tsc --noEmit`
Exit status 2
```

`pnpm --filter @876/invoice-app typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/invoice-app lint`

```text
$ eslint

/root/projects/876/apps/invoice/src/app/login/_components/embedded-auth.tsx
  51:13  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/invoice/src/components/shell/org-switcher.tsx
  17:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/invoice/src/components/shell/user-menu.tsx
  13:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

✖ 3 problems (0 errors, 3 warnings)
```

`pnpm --filter @876/invoice-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/invoice


 Test Files  29 passed (29)
      Tests  229 passed (229)
   Start at  04:35:20
   Duration  17.62s (transform 3.38s, setup 458ms, import 20.22s, tests 6.91s, environment 14.51s)
```

`node scripts/check-app-structure.mjs`

```text
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```
