# Billing navigation registry and Console route binding

## Status

| Phase                              | Status   | Test cases                                                                                                                                 |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 1 — Billing navigation       | Complete | `nav-config.test.ts`: 14 total `it()` cases (rewritten; net +7). `features.test.ts`: 6 total (1 added for canonical/legacy `featureKeys`). |
| Phase 2 — Console workspace routes | Complete | `app-workspaces.test.ts`: 13 total `it()` cases (1 route-binding case added to the pre-existing test file).                                |

## Changed files

- `apps/billing/src/lib/features.ts` — exposes canonical, legacy-normalized `featureKeys` and fails closed on evaluation outage.
- `apps/billing/src/types/features.ts` — adds `featureKeys` to the Billing feature result contract.
- `apps/billing/src/lib/features.test.ts` — covers canonical and legacy `featureKeys` output.
- `apps/billing/src/components/shell/nav-config.ts` — replaces the custom resolver with the shared navigation registry plus the declared-tree href post-pass.
- `apps/billing/src/components/shell/nav-config.test.ts` — covers registry visibility, parent/child feature gating, href behavior, serialization, immutability, and catalog drift.
- `apps/billing/src/components/shell/sidebar.tsx` — consumes server-resolved navigation and resolves string icon keys locally.
- `apps/billing/src/components/shell/nav-dropdown.tsx` — consumes resolved navigation entries and icon styling.
- `apps/billing/src/components/shell/nav-link.tsx` — uses resolved icon components and `colorClassName`.
- `apps/billing/src/components/shell/topbar-search.tsx` — derives search navigation from the already resolved tree; removes the retired resolver reference.
- `apps/billing/src/components/shell/shell.tsx` — threads resolved navigation to sidebar and topbar search.
- `apps/billing/src/app/(app)/layout.tsx` — resolves Billing navigation from the request access context on the server.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/billing/items/page.tsx` — adds the Billing Items placeholder route.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/invoice/items/page.tsx` — adds the Invoice Items placeholder route.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/crm/forms/page.tsx` — adds the CRM Forms placeholder route.
- `apps/console/src/features/orgs/app-workspaces.test.ts` — binds every registered workspace section to a direct or route-group page file.
- `plans/2026-09-02-product-navigation-registries/reports/codex/2026-09-02-billing-nav-registry-and-console-route-binding.md` — this handoff report.

## Verification

| Command                                    | Status | Output status                                                                   |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------- |
| `pnpm --filter @876/billing-app typecheck` | Pass   | `$ tsc --noEmit`                                                                |
| `pnpm --filter @876/billing-app lint`      | Pass   | `$ eslint`; 0 errors, 14 pre-existing warnings outside this change.             |
| `pnpm --filter @876/billing-app test`      | Pass   | 70 test files, 750 tests passed.                                                |
| `pnpm --filter @876/console typecheck`     | Pass   | `$ tsc --noEmit`                                                                |
| `pnpm --filter @876/console lint`          | Pass   | `$ eslint`; no diagnostics.                                                     |
| `pnpm --filter @876/console test`          | Pass   | 138 test files, 1,373 tests passed.                                             |
| `node scripts/check-app-structure.mjs`     | Pass   | `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm)` |

No source-code references to the retired navigation resolver remain. The plan and brief retain historical mentions, which were left untouched by the explicit `plans/` constraint. `git diff --check` also passed.

## Outstanding work and decisions

Nothing remains outstanding. The brief described `app-workspaces.test.ts` as new, but the file already existed on this branch; its existing coverage was preserved and the route-binding test was added to it. The brief both forbade changes under `plans/` and required this exact report path; this report is the narrow exception for the explicit reporting requirement.
