# Phase 1 — shared settings hub

## Changes

| File | Change and reason |
| --- | --- |
| `packages/ui/src/components/settings-hub.tsx` | Added the shared server-rendered settings hub, serializable icon-key contract, internal icon/tint resolver, multi-column layout, and safe no-href fallback. CRM's eight icon tint triples were preserved unchanged. |
| `packages/ui/src/components/settings-hub.test.tsx` | Added contract tests for the shared renderer. **14 `it()` cases added.** |
| `apps/crm/src/app/(app)/settings/_components/settings-group-card.tsx` | Deleted; its presentation responsibility moved to `@876/ui/settings-hub`. |
| `apps/crm/src/app/(app)/settings/_lib/settings-nav.ts` | Retained CRM's settings data only and typed it as `SettingsHubGroup[]`; removed the local icon component/config/resolver ownership. |
| `apps/crm/src/app/(app)/settings/_lib/settings-nav.test.ts` | Kept the navigation invariants and redirected icon validation to the shared exported key list. **0 `it()` cases added.** The old exact-resolver-inventory assertion was removed because CRM no longer owns a resolver and the shared resolver intentionally supports other products' keys. |
| `apps/crm/src/app/(app)/settings/page.tsx` | Removed forbidden explanatory copy, applied `876-page-title`, and adopted `SettingsHub`. |
| `apps/billing/src/app/(app)/settings/(list)/page.tsx` | Kept the existing permission calls unchanged, maps visible sections to serializable hub items, groups them, removes description prose, applies the standard title, and adopts `SettingsHub`. |
| `apps/billing/src/app/(app)/settings/(list)/loading.tsx` | Removed the stale grey grid fallback; this hub cannot know the permission-filtered sections until the page resolves. |
| `apps/billing/src/app/(app)/settings/(list)/loading.test.tsx` | Updated the fallback contract to assert the empty fallback. **0 `it()` cases added.** |
| `apps/billing/src/app/(app)/_components/list-loadings.test.tsx` | Updated the direct aggregate consumer test of the same loading component. **0 `it()` cases added.** This file was not enumerated in the brief, but its stale assertion caused the Billing suite to fail after the required fallback change. |
| `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts` | Added Invoice's planned settings data: Workspace, Sales, and Money. |
| `apps/invoice/src/app/(app)/settings/_lib/settings-nav.test.ts` | Added invoice navigation invariants. **4 `it()` cases added.** |
| `apps/invoice/src/app/(app)/settings/page.tsx` | Replaced the placeholder with a metadata-bearing `Page hub` and shared settings hub. |

## Judgement calls

- Exported `SETTINGS_HUB_ICON_KEYS` alongside the requested union so tests iterate the canonical key list. The union includes all eight CRM keys plus `access`, `banking`, `compliance`, `currencies`, `documents`, `integrations`, `items`, `payments`, `roles`, `taxes`, and `templates`.
- Billing groups are `Compliance` (Taxes & Currencies), `Money` (payment modes, billing/sales, subscriptions, discounts), `Integrations` (payment/accounting providers), and `Access` (users/roles). No pages were invented; each entry comes from the existing permission-filtered section catalog.
- Billing icon translation is keyed by existing setting hrefs: currencies, payments, documents, templates, items, integrations, members, and roles. Component icons remain confined to Billing's existing navigation catalog and never cross into the hub props.
- Invoice keeps `Users` planned with no href, as required for the later phase. Its other planned items use `preferences`, `templates`, `documents`, `payments`, and `taxes`.
- The strict shared-UI maintainability review found no blocker: the 260-line shared component is the canonical presentation owner, contains no client boundary or behavior flags, and the Billing adapter remains a focused page-local translation at the RSC boundary.

## Verification

Workspace names were confirmed from `package.json`: `@876/ui`, `@876/crm-app`, `@876/billing-app`, and `@876/invoice-app`. The CRM command in the brief used `@876/crm`; this workspace is actually named `@876/crm-app`, so that real name was used.

| Command | Result | Output tail |
| --- | --- | --- |
| `pnpm --filter @876/ui typecheck` | Passed | `$ tsc --noEmit` |
| `pnpm --filter @876/ui test` | Passed | `Test Files  20 passed (20)`<br>`Tests  143 passed (143)`<br>`Duration  19.08s (transform 1.33s, setup 4.57s, import 10.55s, tests 13.02s, environment 23.04s)` |
| `pnpm --filter @876/crm-app typecheck` | Passed | `$ tsc --noEmit` |
| `pnpm --filter @876/crm-app test` | Passed | `Test Files  27 passed (27)`<br>`Tests  213 passed (213)`<br>`Duration  28.63s (transform 2.13s, setup 5.33s, import 16.51s, tests 23.12s, environment 32.85s)` |
| `pnpm --filter @876/billing-app typecheck` | Passed | `$ tsc --noEmit` |
| `pnpm --filter @876/invoice-app typecheck` | Passed | `$ tsc --noEmit` |
| `node scripts/check-app-structure.mjs` | Passed | `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm)` |

The UI and CRM test runs were also run with Vitest's dot reporter to capture their complete completion tails above. As additional affected-suite verification, Billing passed **69 files / 720 tests** and Invoice passed **18 files / 155 tests**. Billing emitted the pre-existing jsdom informational line `Not implemented: navigation to another Document`; it did not fail the suite.

### Command output tails

```text
$ pnpm --filter @876/ui typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/ui test -- --reporter=dot
$ vitest run -- --reporter=dot

 RUN  v4.1.11 /root/projects/876/packages/ui

 Test Files  20 passed (20)
      Tests  143 passed (143)
   Start at  10:57:03
   Duration  19.08s (transform 1.33s, setup 4.57s, import 10.55s, tests 13.02s, environment 23.04s)
```

```text
$ pnpm --filter @876/crm-app typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/crm-app test -- --reporter=dot
$ vitest run -- --reporter=dot

 RUN  v4.1.11 /root/projects/876/apps/crm

 Test Files  27 passed (27)
      Tests  213 passed (213)
   Start at  10:58:02
   Duration  28.63s (transform 2.13s, setup 5.33s, import 16.51s, tests 23.12s, environment 32.85s)
```

```text
$ pnpm --filter @876/billing-app typecheck
$ tsc --noEmit

$ pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit
```

```text
$ node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm)
```

`git diff --check` passed. No `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as` was introduced.

## Not done / contradictions

Nothing in scope remains undone. No production-code contradiction with the brief was found. The only scope-adjacent discovery was Billing's aggregate loading test, which imported the required loading fallback and asserted its now-forbidden skeleton grid; it was updated as a necessary direct test consumer.

Unrelated pre-existing working-tree changes under `packages/account`, `packages/workspace`, and the plan briefs directory were left untouched.
