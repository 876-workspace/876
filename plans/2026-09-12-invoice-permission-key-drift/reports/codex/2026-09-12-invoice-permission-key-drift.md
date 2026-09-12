# Invoice permission-key drift report

## Changed files

- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx` — changed the
  document-toolbar edit gate from undefined `invoices.write` to canonical
  `invoices.edit`.
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/edit/page.tsx` — changed
  the invoice edit-route guard to `invoices.edit`.
- `apps/invoice/src/app/(app)/quotes/[quoteId]/edit/page.tsx` — changed the
  quote edit-route guard from finance-plane `sales:write` to app-access
  `quotes.edit`.
- `apps/invoice/src/lib/auth/permission-keys.test.ts` — adds a node-side source
  scanner for literal `requireAppPermission` and `canAccess` keys, catalog
  membership and colon-key assertions, plus direct extraction unit coverage.
- `plans/2026-09-12-invoice-permission-key-drift/reports/codex/2026-09-12-invoice-permission-key-drift.md`
  — records this implementation and its verification results.

The new test file contains 6 `it()` cases.

## Verification

`pnpm --filter @876/invoice-app typecheck` tail:

```
$ tsc --noEmit
```

`pnpm --filter @876/invoice-app lint` tail:

```
/root/projects/876/apps/invoice/src/components/shell/user-menu.tsx
  19:5  warning  Do not use `window.location.assign()` to navigate to internal Next.js pages. Use `redirect()` in the render phase, or `useRouter().push()` in Client Components' event handlers instead. See: https://nextjs.org/docs/messages/no-location-assign-relative-destination  @next/next/no-location-assign-relative-destination

✖ 6 problems (0 errors, 6 warnings)
```

`pnpm --filter @876/invoice-app test` tail:

```
 Test Files  83 passed (83)
      Tests  539 passed (539)
   Start at  18:54:23
   Duration  34.19s (transform 6.52s, setup 849ms, import 37.15s, tests 22.04s, environment 23.74s)
```

## Notes

- `apps/invoice/vitest.config.ts` uses the `node` environment, as required for
  the filesystem scanner.
- The package exports `invoicePermissionCatalog` through the verified
  `@876/core/access/catalogs` subpath; the `@876/core/access` barrel does not
  export it. The test imports the catalog rather than duplicating its keys.
- All requested checks completed. Lint exited successfully with six existing
  warnings outside this change; it had no errors.
- No type escape, lint suppression, catalog change, or unresolved product
  decision was introduced.
