# Brief: 876 Billing app — Templates and Branding settings

Working directory `/root/projects/876-invoice-branding`. You are the only agent running on a memory-constrained host: run ONE verification command at a time. Do not commit, switch branches or create worktrees. File scope: `apps/billing/` only.

## Read first (read budget: these files, then write)

1. `plans/2026-09-15-document-templates-and-branding/briefs/shared-host-templates-spec.md` — **the spec you are implementing**.
2. `apps/billing/src/app/api/invoice-preferences/[[...path]]/route.ts` — Pattern B proxy (copy it for `document-templates` and `branding`).
3. `apps/billing/src/lib/api/resource-manifest.ts` and `apps/billing/src/lib/api/backend-boundary.test.ts` — register both new resources in the manifest and in the test's `APP_RESOURCES` list.
4. `apps/billing/src/lib/client/invoice-preferences.ts` and `apps/billing/src/lib/client/index.ts` — add `lib/client/document-templates.ts` and `lib/client/branding.ts` (paths `/api/v1/document-templates…`, `/api/v1/branding`) and wire them.
5. `apps/billing/src/lib/service/index.ts` (look at `invoicePreferences` and the `list`/`detail` helpers near lines 136–150) — add `documentTemplates.{list, retrieve, resolve}` and `branding.retrieve` server reads the same way.
6. `apps/billing/src/app/(app)/settings/billing/page.tsx` — guard pattern: `requirePagePermission('sales:read')`, `canManage = context.permissions.includes('sales:write')`.
7. `apps/billing/src/components/shell/nav-config.ts` — add two settings sections: `Templates` (`/settings/templates`, permissions `['sales:read']`, icon e.g. `FileText`) and `Branding` (`/settings/branding`, permissions `['sales:read']`, icon e.g. `Palette`), using the existing object shape and a one-line description like siblings. Check the icon exists in the import source used there.
8. `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/page.tsx` — spec §5.

Routes: `apps/billing/src/app/(app)/settings/templates/page.tsx`, `templates/new/page.tsx`, `templates/[templateId]/page.tsx`, `settings/branding/page.tsx`, each with `_components/` for adapters. The branding page's `logoHref` is `null` unless Billing has an organization profile settings page (check `nav-config.ts`).

## Verification (from repo root, one at a time)

```bash
pnpm --filter @876/billing-app exec vitest run src/lib/api src/lib/client 'src/app/(app)/settings' 'src/app/(app)/(sales)/invoices' src/components/shell
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

(Check the package name in `apps/billing/package.json` if the filter fails.)

## Report

`plans/2026-09-15-document-templates-and-branding/reports/opencode/2026-09-15-billing-host-templates.md`: files, counted tests, verification output, gaps.
