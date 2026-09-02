# Brief — Expose the payment instrument plane through `$876` and Console

## Read first

1. `.claude/rules/billing-data-plane.md` — normative, especially "Billing
   accounts — the payer, not a payment method" and the three security tiers.
2. `docs/billing/stripe-object-mapping.md` and `docs/billing/payment-instruments.md`.
3. `.claude/rules/sdk-conventions.md` — the `$876.<resource>.<verb>()` surface,
   the tier gating rule, no bespoke flat wrappers.
4. `.claude/rules/api-access.md` and `.claude/rules/product-api-boundary.md` —
   Console browser URLs name Console resources, never a service namespace.
5. `.claude/rules/app-layout.md`, `.claude/rules/data-loading.md`, root
   `CLAUDE.md` → "UI Copy" / "UI Design" / "Loading States & Suspense Placement".

## Prerequisite, already on this branch

`apps/billing-api` now has `PaymentMethod`, `PaymentCredential`, `SetupIntent`,
`Mandate`, `PaymentIntent`, `Dispute` and `ProviderReference`, with the modules
`payment-methods` and `payment-intents` mounted under `/api/v1`. Read those
routes and their serializers before writing a client method; the route paths and
the serialized shapes in the code are the contract, not this brief.

## Task 1 — `packages/billing`

Add resources under `packages/billing/src/resources/`, following
`payment-modes.ts` exactly for structure: a `create<Name>Resource(runtime)`
factory, one thin method per verb over `Request`, a Zod schema per response in
`schemas.ts`, and types in `types/`.

- `payment-methods.ts` — `list`, `create`, `retrieve`, `update`, `delete`,
  `setDefault`, and `listForCustomer(customerId, …)`.
- `payment-intents.ts` — `list`, `create`, `retrieve`, `confirm`, `capture`,
  `cancel`.

Verb vocabulary is fixed by `.claude/rules/sdk-conventions.md`: `create`,
`retrieve`, `list`, `update`, `delete`. `setDefault` is the one addition, and it
is a named lifecycle action on an existing resource, not a `retrieveBy*`.

Compose both into the admin and integration clients the way the existing billing
resources are composed. **A payment method's sealed credential must not appear
in any response type** — if a serializer ever returned one, the Zod schema here
is the second line of defence and must reject it.

## Task 2 — `packages/client`

Add `paymentMethods`, `paymentIntents` (and `setupIntents`, `mandates`,
`disputes` when their routes exist) to `RESOURCE_MANIFEST` with
`owner: 'billing'`, and wire them through the billing composer so
`$876.paymentMethods.*` resolves. Update `surface-contract.test.ts` and
`admin-core-surface.test.ts` to assert the new resources are present on the
server surface and **absent** from the browser surface — a payment instrument
API must never be reachable from a browser client.

## Task 3 — Console route handlers

Pure transport, Console-resource URLs, permission-checked, no business logic:

```
apps/console/src/app/api/payment-methods/route.ts                 GET list, POST create
apps/console/src/app/api/payment-methods/[id]/route.ts            GET, PATCH, DELETE
apps/console/src/app/api/payment-methods/[id]/default/route.ts    POST
```

Do **not** create `/api/billing/*` or `/api/v1/*` — see
`.claude/rules/api-access.md` → "Console browser routes". Guard with
`requireConsolePermission` for the existing billing permission, matching the
neighbouring `billing-subscriptions` routes.

## Task 4 — Console: billing details on the subscription panel

The user-visible goal:
`/orgs/<slug>/subscriptions` → open a subscription → **see how it is paid**.

`apps/console/src/app/(app)/orgs/[slug]/subscriptions/_components/subscription-detail.tsx`
today shows status, period, items and flags. Add a **Billing** section below the
existing ones showing:

- the **billing account** this subscription is billed to — name, currency, tax
  status, balance — with the account id as muted metadata, and the plain fact
  that a billing account is the payer (no explanatory paragraph; the rule
  forbids one — the labels carry it);
- the **payment method** in force: the subscription's own
  `default_payment_method_id` when set, otherwise the billing account's default,
  labelled so it is obvious which of the two is being used;
- the other payment methods on that billing account, as a short list with
  brand/last4/expiry and a default badge;
- the latest invoice, if any, linking to it.

Hard requirements:

- **An organization with no payment method is a normal, valid state.** Render it
  as a plain "None" row, not an error, not a warning colour, not a call to
  action. Every org is on a free plan today; this is the common case, not the
  exception.
- The detail panel is a client component. The live reads happen in the **server**
  page that already loads the subscription, and the resolved data is passed
  down. Do not add a browser fetch for initial data
  (`.claude/rules/data-loading.md`).
- Follow the loading rules: the panel's chrome and the fields it already has
  render immediately; only the billing block waits, behind its own boundary with
  a shape-matched fallback. Do not put the whole panel behind one skeleton.
- Resolve the billing account and its payment methods in **one** request each —
  never one request per payment method, and never a request per row of the
  subscriptions list.
- Never render a full PAN or a credential. Brand, last4, expiry, and the display
  label only.

Where the org has no Billing tenant or no customer at all — entirely possible —
the section renders "Not set up" and nothing throws.

## Task 5 — parity where subscriptions are also shown

`apps/console/src/app/(app)/orgs/[slug]/billing/subscriptions/` and
`apps/console/src/app/(app)/apps/[slug]/subscribers/[subscriptionId]/` show the
same subject. Add the same billing summary there **only if it is a small,
faithful reuse of the component you build in Task 4** — extract it to
`apps/console/src/features/billing/components/` per
`.claude/rules/app-structure.md` and use it in all three. If it cannot be shared
cleanly, do Task 4 only and say so in your report rather than duplicating it.

## Verification — foreground, real output, all of them

```
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/client typecheck
pnpm --filter @876/client test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
npx prettier --check <every file you touched>
```

## Constraints

- Do not commit.
- Do not touch `apps/api`, `apps/billing-api/prisma`, or `packages/core`.
- Do not add a `/api/billing/*` or `/api/v1/*` route to Console.
- Do not add a reveal/decrypt endpoint or return a sealed value anywhere.
- Do not style a button green; do not add a descriptive `<p>` under a heading.
- Follow `.claude/rules/testing.md`.
