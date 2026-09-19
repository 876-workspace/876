# Unit A (finish) — adopt the shared experiment resolver in the last four apps

## State

`packages/core/src/platform/experiments.ts` already exports
`createExperimentDecisionsFetcher` and `createAppExperimentResolver`. Four apps
already use them: `apps/876`, `apps/crm`, `apps/enterprise`, `apps/projects`.
**Do not change core, and do not change those four.**

Four remain, each still carrying its own byte-identical copy of the block:

```
apps/billing/src/lib/features.ts
apps/console/src/lib/features.ts
apps/couriers/src/lib/features.ts
apps/invoice/src/lib/features.ts
```

## The pattern to copy, verbatim from `apps/crm/src/lib/features.ts`

```ts
import { cache } from 'react'
import {
  createAppExperimentResolver,
  createExperimentDecisionsFetcher,
} from '@876/core/platform'

import { getPlatformClient } from '@/lib/clients/platform'
import { CRM_APP_SLUG } from '@/lib/crm-app'

const getExperimentDecisions = cache(
  createExperimentDecisionsFetcher({
    appSlug: CRM_APP_SLUG,
    getPlatformClient,
  })
)
```

Read `apps/crm/src/lib/features.ts` in full once, then apply the same shape to
the four remaining files, substituting that app's slug constant.

**Read budget: 5 files.** The CRM reference plus the four targets. Nothing else.

## Rules

- **Keep each app's exported wrapper name exactly as it is today** —
  `getBillingExperiment`, `getConsoleExperiment`, `getCouriersExperiment`,
  `getInvoiceExperiment`. No file outside `features.ts` may need editing; grep
  to confirm and state the result in your report.
- `cache()` stays in the app, wrapping the fetcher **once**. It must receive the
  three primitives, never an object literal — `React.cache` compares with
  `Object.is`, so an object argument silently disables memoisation.
- Do **not** touch `getFeatures`, `DEFAULT_UI_FEATURES`, `UI_FEATURES`,
  `LEGACY_FEATURE_SLUGS`, widget resolution, or any feature-slug string.
- Do **not** modify `packages/core`.
- Do **not** add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do **not** `git commit`, branch, or open a PR.

Note the import path is `@/lib/clients/platform` — the directory was renamed
from `services/` to `clients/`. Use whatever the file currently says; do not
change it.

## Verify

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/core test
```

## Report

`plans/sep/19-lib-structure-consolidation/reports/opencode/2026-09-19-unit-a-finish.md`
— the four files, the grep proving no external call site changed, verification
output, anything unverified.
