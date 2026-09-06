# Billing document-form migration

## Files changed

- `apps/billing/src/features/documents/components/document-create-form.tsx`
  now renders `DocumentLineItemsEditor`, normalizes catalogue minor-unit values
  for its major-unit draft contract, owns price-list subtotal resolution, and
  gates submission on the shared totals snapshot.
- `apps/billing/src/features/documents/document-create-model.ts` adopts the
  shared `DocumentLineDraft` and retains only payload preparation using exact
  minor-unit strings and `bigint` arithmetic.
- `apps/billing/src/features/documents/document-create-model.test.ts` removes
  the deleted float-total coverage and keeps payload coverage, including a
  server-resolved percentage discount.
- `apps/billing/src/features/documents/components/document-create-form.test.tsx`
  adds 10 form-level cases for the shared-editor integration.
- `apps/billing/src/features/documents/components/document-line-editor.tsx`
  was deleted.

## Tests

New `it()` cases: **10** (all in `document-create-form.test.tsx`). The focused
document suite passed 14 cases total, including the four retained model cases.

## Decisions

- The existing route catalogue values are minor-unit strings, while the shared
  editor accepts major-unit draft strings. The Billing host converts only the
  display draft value with `formatMinorAmountInput`; submitted values still
  flow through `prepareDocumentLine` into minor-unit strings.
- Price-list selection clears prior resolved subtotals in the selection event
  handler, avoiding a synchronous React state update inside the resolver
  effect. The asynchronous server resolution remains in the form host.
- `credit-notes` was left unchanged: it does not import the deleted editor and
  the requested migration specifically names `document-create-form.tsx`.

## Verification output

`pnpm --filter @876/billing-app typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/billing-app lint`

```text
$ eslint

/root/projects/876/apps/billing/src/app/(app)/(sales)/credit-notes/new/_components/credit-note-create-form.tsx
  25:3  warning  'items' is defined but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/billing/src/app/(app)/(subscription-management)/(catalog)/price-lists/_components/price-lists-section.tsx
  30:20  warning  '_columns' is assigned a value but never used  @typescript-eslint/no-unused-vars

/root/projects/876/apps/billing/src/app/get-started/_components/create-organization.tsx
  63:9  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/billing/src/app/get-started/_components/setup-button.tsx
  45:7  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination
  64:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/billing/src/app/login/_components/embedded-auth.tsx
   5:10  warning  'create876AccountClient' is defined but never used                                                                                                                                                                                                                      @typescript-eslint/no-unused-vars
  48:13  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/billing/src/app/no-access/_components/no-access-actions.tsx
  24:7  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/billing/src/components/shell/org-switcher.tsx
  26:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/billing/src/components/shell/user-menu.tsx
  19:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

/root/projects/876/apps/billing/src/features/settings/components/currency-settings.tsx
   23:10  warning  'ResourceToolbar' is defined but never used                                                                    @typescript-eslint/no-unused-vars
  114:18  warning  'handleSetDefault' is defined but never used                                                                   @typescript-eslint/no-unused-vars
  195:5   warning  React Hook useMemo has a missing dependency: 'handleDelete'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

/root/projects/876/apps/billing/src/types/banking.ts
  4:3  warning  'IdSchema' is defined but never used  @typescript-eslint/no-unused-vars

✖ 14 problems (0 errors, 14 warnings)
```

The warnings are pre-existing and outside this migration. This change
introduced no lint errors.

Focused document verification run:

```text
 RUN  v4.1.11 /root/projects/876/apps/billing

 Test Files  2 passed (2)
      Tests  14 passed (14)
```

`pnpm --filter @876/billing-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/billing
```

The full test command did not produce a completion status before the execution
environment returned at roughly 30 seconds, so the complete app test suite was
not verified in this run.

`grep -rn "document-line-editor\|calculateDocumentLineTotal" apps/billing/src`

```text
grep exit status: 1
```

It produced no matches (exit status 1 is `grep`'s expected no-match status).

`git diff --check` produced no output.
