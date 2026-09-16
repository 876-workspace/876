# Invoice quotes surface

## Files changed

- `apps/invoice/src/lib/api/resource-manifest.ts` and its test register `quotes`
  in the sorted, enumerable proxy surface and prove it accepts `quotes` while
  rejecting an unlisted resource.
- `apps/invoice/src/lib/invoice.ts` binds the existing integration quote
  resource to the active organization.
- `apps/invoice/src/app/api/quotes/[[...path]]/route.ts` and its test add the
  literal-only Quote proxy route. The test proves a path tail such as
  `payments/pay_123` remains a tail below the fixed `quotes` resource.
- `apps/invoice/src/app/(app)/quotes/new/page.tsx` and its test add the
  shell-style quote create page: facade check, no-access redirect, server-started
  customer read, and `DocumentCreateForm kind="quote"`.
- `apps/invoice/src/lib/client/invoices.ts` and its test let the one existing
  document-create client accept either permitted same-origin document endpoint;
  `apps/invoice/src/lib/client/index.ts` exposes that existing client.
- `apps/invoice/src/features/documents/components/document-create-form.tsx` and
  its test move the feature component into `components/`, submit to its
  configured endpoint, and render quote-specific copy and local failure state.
  `apps/invoice/src/features/documents/document-create-model.ts` remains the
  pure helper. The Invoice create page importer was updated to the moved path.

## Decisions

No `quotes.ts` browser client was created. Invoice and quote creation share the
same JSON-safe document-line payload shape, so `invoices.create(params,
endpoint)` owns one same-origin transport and accepts only `/api/invoices` or
`/api/quotes`. This avoids a second near-identical client while the form chooses
the endpoint from its existing kind configuration.

## Tests

This phase adds **9** literal `it()` cases: 2 manifest cases, 1 browser-client
case, 3 quote-form cases, 1 proxy-route case, and 2 quote-page cases. The
touched test files contain 28 literal `it()` cases in total.

The quote coverage asserts the literal proxy segment, quote page title and
submit label, exact quote request body, and the negative-space failure state:
the form and entered values remain mounted, the error is a form-local status
notice, and no Sonner toast is rendered.

## Deliberate gaps and verification limits

No Billing API, package, provisioning profile, or scope grant was changed.
The deployed Invoice connection must be granted `billing.quotes.read` and
`billing.quotes.write` on its provisioning-profile revision. Until that data
revision is made, the new Quote proxy route will return an authorization failure.

The local typecheck, lint, test, and structure checks below were run. Lint has
three existing warnings in unrelated Invoice files and zero errors.

## Verification output

```text
$ pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/invoice-app lint
$ eslint

/root/projects/876/apps/invoice/src/app/login/_components/embedded-auth.tsx
  51:13  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/invoice/src/components/shell/org-switcher.tsx
  17:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/invoice/src/components/shell/user-menu.tsx
  13:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

✖ 3 problems (0 errors, 3 warnings)
```

```text
$ pnpm --filter @876/invoice-app test
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/invoice


 Test Files  33 passed (33)
      Tests  251 passed (251)
   Start at  14:04:43
   Duration  15.32s (transform 2.49s, setup 504ms, import 14.82s, tests 9.66s, environment 12.98s)
```

```text
$ node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```
