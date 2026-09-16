# Invoice `/invoices/new`

## Files changed

- `apps/invoice/src/app/(app)/invoices/new/page.tsx` — adds the server page, resolves the Invoice-scoped facade, starts the customer read, and streams only the customer control into the form.
- `apps/invoice/src/app/(app)/invoices/_components/invoices-toolbar.tsx` — changes the primary action label to `Add` while retaining `/invoices/new`.
- `apps/invoice/src/features/documents/document-create-form.tsx` — adds the invoice/quote-shaped create composition, plain shared line editor, totals-snapshot submission gate, local error notice, and same-origin mutation flow.
- `apps/invoice/src/features/documents/document-create-model.ts` — converts a valid shared-editor draft into the integration schema's JSON-safe minor-unit integer strings without calculating totals.
- `apps/invoice/src/features/documents/document-create-form.test.tsx` — adds 10 form cases covering shared-editor use, streaming select state, validation, totals gating, schema body, and failed submissions.
- `apps/invoice/src/lib/client/invoices.ts` — adds the browser mutation client for the Invoice-owned API route.
- `apps/invoice/src/lib/client/invoices.test.ts` — adds 4 client cases covering same-origin endpoint selection and body serialization.
- `apps/invoice/src/lib/client/index.ts` — exposes the invoice mutation client.

New `it()` cases: **13**.

## Decisions

- The `kind` configuration contains title, submit label, endpoint, and return URL for both invoices and quotes, but only `kind="invoice"` is rendered. No quote page, proxy route, or manifest entry was created.
- The brief asks the page to load both customers and items while also requiring the editor's plain mode with no `items` prop. I loaded the customer list because it owns a mounted select. I did **not** issue an otherwise unused item request: that would be a dead service read, and making the customer select wait on it would violate the form-shell loading rule. The manual-line editor intentionally has no catalog control.
- Amounts sent by the form are minor-unit integer strings. This is accepted by `IntegrationInvoiceCreateSchema` and preserves values beyond JavaScript's safe numeric range; form state uses strings and arithmetic remains in the shared `@876/core/money`/editor path.

## Verification output

```text
$ tsc --noEmit
$ eslint

/root/projects/876/apps/invoice/src/app/login/_components/embedded-auth.tsx
  51:13  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/invoice/src/components/shell/org-switcher.tsx
  17:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/invoice/src/components/shell/user-menu.tsx
  13:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

✖ 3 problems (0 errors, 3 warnings)

$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/invoice


 Test Files  31 passed (31)
      Tests  242 passed (242)
   Start at  04:51:15
   Duration  20.31s (transform 4.08s, setup 523ms, import 20.89s, tests 8.08s, environment 18.98s)

app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

I also completed the required strict maintainability review. It removed an unnecessary future quote transport option from the invoice browser client; the unwired quote configuration remains form-local. I did not verify an item-backed Invoice catalog control because the requested plain editor deliberately excludes it. No server actions, Billing-origin browser calls, local line editor, suppressions, or casts were added.
