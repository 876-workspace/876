# Invoice and Couriers bounded-client migration — blocked report

Date: 2026-08-30

## Outcome

The application migration was not applied. The available bounded package
entrypoints cannot express all existing calls at the same authority and request
paths. The brief explicitly requires stopping in that condition instead of
substituting an operator/internal-key client or another route.

No file under `apps/invoice/**` or `apps/couriers/**` was changed. Their
`src/lib/876/` directories remain because both apps still import them.

## Invoice

### Existing composition roots

- `apps/invoice/src/lib/876/index.ts` uses `@876/client/server` to construct a
  request-scoped Invoice facade. It validates the signed-in session, redirects
  to `/login` if the session/access token is absent, reads `x-request-id`, binds
  the active `organizationId`, and supplies both the user's access token and the
  Invoice app key.
- `apps/invoice/src/lib/876/billing-integration.ts` already uses
  `@876/billing/integration`. It validates the Invoice session and authenticates
  the server hop with `INVOICE_API_876_KEY`, preserving integration authority.
- `apps/invoice/src/lib/876/platform-client.ts` uses the old internal-key Core
  bootstrap transport. Its runtime supplies `API_INTERNAL_KEY` and
  `INVOICE_API_876_KEY` and forwards `x-request-id`.

### Intended replacements and lifetimes

- Billing: `@876/billing/integration`, request-scoped, because the Invoice
  session must be validated first and `x-request-id` belongs to the request.
  Organization binding would remain in the app-owned Billing module.
- Account: `@876/account`, same-origin browser client for login/auth only.
- Workspace: `@876/workspace/session`, request-scoped and bound to the signed-in
  user's access token for the user's own organization reads.
- Platform: `@876/platform/operator` only for calls already using the existing
  internal-key Core bootstrap client.

None was installed into Invoice because the full replacement cannot currently
preserve behavior.

### Authority/path blockers

1. Invoice's quote page calls `quotes.list()` through the current Billing
   transport. `@876/billing/integration` exports resources for organizations,
   bank accounts, customers, items, invoices, payment modes, payment methods,
   payment intents, and payments, but no `quotes` resource. The existing quote
   client uses `GET /api/v1/quotes`; there is no Billing integration quote
   client or matching integration route in the repository. Using the Billing
   tenant client would preserve the old call mechanically but violate the
   required Invoice integration authority. Using an operator client would be a
   privilege escalation.
2. Invoice onboarding calls the existing Core bootstrap operation at
   `POST /organizations/bootstrap`. `@876/workspace/session` has no organization
   create/bootstrap operation. `@876/platform/operator` has an organization
   create operation, but it targets `POST /organizations`, which changes both
   the request path and the authority contract. No substitution was made.

## Couriers

### Existing composition root

`apps/couriers/src/lib/876/index.ts` currently composes:

- `create876CouriersAdminClient`: Couriers operator/admin calls with
  `API_INTERNAL_KEY`, `API_876_KEY`, and optional request ID.
- `create876BillingIntegrationClient`: Billing integration calls with
  `API_876_KEY` and optional request ID.
- `create876StorageClient`: Storage service calls with
  `STORAGE_INTERNAL_KEY`.
- `createWidgetsClient`: Widgets service/member calls with
  `WIDGETS_SERVICE_KEY`.
- `create876ServerClient`: request-scoped Couriers calls with the signed-in
  user's access token, app key, request ID, Storage key, and Widgets service
  key.

`apps/couriers/src/lib/876/platform-client.ts` separately constructs the old
internal-key Core bootstrap client and forwards `x-request-id`.

### Intended replacements and lifetimes

- Couriers: `@876/couriers/operator` as a lazy module singleton for static
  server credentials, plus the appropriate request-scoped Couriers client for
  the signed-in access token. The access-token-bound client cannot be a
  singleton.
- Billing: `@876/billing/integration`, lazy module singleton for the static app
  credential, with per-request construction where `x-request-id` must be
  forwarded.
- Storage: `@876/storage/service`, lazy module singleton because its internal
  service credential is static.
- Widgets: `@876/widgets/service`, lazy module singleton because its service
  credential is static.
- Workspace: `@876/workspace/session`, request-scoped wherever the signed-in
  user's own organization is the authority.
- Platform: `@876/platform/operator` only where the existing Core client already
  uses `API_INTERNAL_KEY`.

None was installed into Couriers because the full replacement cannot currently
preserve behavior.

### Authority/path blockers

1. Couriers exposes same-origin country and region routes backed by the old Core
   client's `countries.list()` and `regions.list(countryCode)`. Neither
   `@876/platform/operator` nor `@876/workspace/session` exposes these geo
   resources. Reaching around the bounded clients with a raw service request or
   retaining the old Core root would not complete the requested migration.
2. Couriers onboarding also calls `POST /organizations/bootstrap`. As with
   Invoice, no bounded root exposes that exact operation at the existing
   contract. The operator organization create operation uses
   `POST /organizations`, so it is not an allowed replacement.

## Files changed

- `.claude/reports/codex/2026-08-30-invoice-couriers-client-migration.md` —
  records the authority blockers and verification evidence.

No application, test, manifest, Next config, or lockfile change was made by this
task.

## Dependencies and transpilation

No `package.json` dependency or `next.config.ts` `transpilePackages` entry was
added because the migration was stopped before application edits. No install
was started by this task. A different concurrent agent changed another app's
manifest and regenerated `pnpm-lock.yaml` while verification was running.

## Test counts

| App      |               Before |    After app changes | Result                                                                                                                                                         |
| -------- | -------------------: | -------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invoice  | 10 files / 118 tests | 10 files / 118 tests | All passed; no app changes were made.                                                                                                                          |
| Couriers | 72 files / 766 tests | 72 files / 766 tests | All passed; no app changes were made. Contrary to the supplied main-branch note, this checked-out branch produced zero failures, not the three named failures. |

The initial Couriers baseline and the later standalone rerun both reported 72
files / 766 tests passing.

## Verification output

### Baseline: `pnpm --filter @876/invoice-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/invoice


 Test Files  10 passed (10)
      Tests  118 passed (118)
   Start at  23:26:10
   Duration  1.98s (transform 625ms, setup 167ms, import 2.15s, tests 282ms, environment 2ms)
```

### Baseline: `pnpm --filter @876/couriers-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/couriers

Not implemented: navigation to another Document

 Test Files  72 passed (72)
      Tests  766 passed (766)
   Start at  23:26:17
   Duration  65.88s (transform 7.49s, setup 29.48s, import 42.86s, tests 54.91s, environment 39.80s)
```

### `pnpm --filter @876/invoice-app typecheck  && pnpm --filter @876/invoice-app test`

```text
$ tsc --noEmit
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/invoice


 Test Files  10 passed (10)
      Tests  118 passed (118)
   Start at  23:30:14
   Duration  1.37s (transform 429ms, setup 123ms, import 1.55s, tests 207ms, environment 2ms)
```

Exit status: 0.

### `pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app test`

```text
$ tsc --noEmit
src/lib/finance/customers.ts(55,23): error TS2322: Type '{ data: { object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }; error: null; }' is not assignable to type 'IntegrationResult<BillingCustomer>'.
  Type '{ data: { object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }; error: null; }' is not assignable to type '{ data: BillingCustomer; error: null; }'.
    Types of property 'data' are incompatible.
      Type '{ object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }' is not assignable to type 'BillingCustomer'.
        Type '{ object: "customer"; id: string; }' is missing the following properties from type 'BillingCustomer': sourceAppId, sourceExternalReference, customerType, customerKind, and 22 more.
src/lib/finance/customers.ts(108,3): error TS2322: Type 'Result<{ object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }>' is not assignable to type 'IntegrationResult<BillingCustomer>'.
  Type '{ data: { object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }; error: null; }' is not assignable to type 'IntegrationResult<BillingCustomer>'.
    Type '{ data: { object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }; error: null; }' is not assignable to type '{ data: BillingCustomer; error: null; }'.
      Types of property 'data' are incompatible.
        Type '{ object: "customer"; id: string; sourceAppId: string | null; sourceExternalReference: string | null; customerType: "EXTERNAL" | "CORE_USER" | "CORE_ORGANIZATION"; customerKind: "INDIVIDUAL" | "BUSINESS"; ... 22 more ...; counts?: { ...; } | undefined; } | { ...; }' is not assignable to type 'BillingCustomer'.
          Type '{ object: "customer"; id: string; }' is missing the following properties from type 'BillingCustomer': sourceAppId, sourceExternalReference, customerType, customerKind, and 22 more.
/root/projects/876/apps/couriers:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/couriers-app@0.1.0 typecheck: `tsc --noEmit`
Exit status 2
```

Exit status: 2. The `&&` short-circuited, so this invocation did not run the
test half. The error appeared after concurrent package changes in the shared
worktree and is unrelated to an app change from this task.

### Standalone after-check: `pnpm --filter @876/couriers-app test`

```text
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/couriers

Not implemented: navigation to another Document

 Test Files  72 passed (72)
      Tests  766 passed (766)
   Start at  23:32:01
   Duration  61.74s (transform 7.66s, setup 27.54s, import 40.34s, tests 55.18s, environment 35.63s)
```

Exit status: 0.

### `npx prettier --check "apps/{invoice,couriers}/**/*.{ts,tsx}"`

```text
Checking formatting...
All matched files use Prettier code style!
```

Exit status: 0.

### `grep -rn "@876/client\|lib/876" apps/invoice/src apps/couriers/src`

```text
apps/invoice/src/lib/876/index.ts:6:} from '@876/client/server'
apps/invoice/src/lib/invoice.ts:3:import { getInvoiceBillingIntegration } from '@/lib/876/billing-integration'
apps/invoice/src/lib/auth/account-validity.ts:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/lib/auth/context.ts:7:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/lib/auth/context.test.ts:20:vi.mock('@/lib/876/platform-client', () => ({
apps/invoice/src/app/(app)/payments/page.tsx:19:import { get876Client } from '@/lib/876'
apps/invoice/src/app/(app)/items/[itemId]/edit/page.tsx:4:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/app/(app)/items/new/page.tsx:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/app/(app)/invoices/page.tsx:20:import { get876Client } from '@/lib/876'
apps/invoice/src/app/(app)/quotes/page.tsx:19:import { get876Client } from '@/lib/876'
apps/invoice/src/app/(app)/customers/new/page.tsx:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx:4:import { get876Client } from '@/lib/876'
apps/invoice/src/app/(app)/customers/[customerId]/edit/page.tsx:6:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/app/(app)/sales-receipts/page.tsx:19:import { get876Client } from '@/lib/876'
apps/invoice/src/app/api/onboarding/organization/route.test.ts:23:vi.mock('@/lib/876/platform-client', () => ({
apps/invoice/src/app/api/onboarding/organization/route.ts:8:import { getPlatformClient } from '@/lib/876/platform-client'
apps/invoice/src/app/login/_components/embedded-auth.tsx:3:import { create876Client } from '@876/client'
apps/couriers/src/lib/portal/enroll.ts:3:import { billingIntegration } from '@/lib/876'
apps/couriers/src/lib/portal/enroll.test.ts:18:vi.mock('@/lib/876', () => ({
apps/couriers/src/lib/876/index.ts:7:} from '@876/client/server'
apps/couriers/src/lib/features.test.ts:15:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/lib/manage/customers.ts:21:  const { get876Client } = await import('@/lib/876')
apps/couriers/src/lib/manage/customers.ts:47:  const { get876Client } = await import('@/lib/876')
apps/couriers/src/lib/manage/customers.ts:81:  const { get876Client } = await import('@/lib/876')
apps/couriers/src/lib/manage/customers.test.ts:9:vi.mock('@/lib/876', () => ({
apps/couriers/src/lib/features.ts:11:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/lib/auth/account-validity.ts:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/lib/auth/account-validity.test.ts:13:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/lib/auth/manage-context.test.ts:31:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/lib/auth/manage-context.test.ts:37:vi.mock('@/lib/876', () => ({
apps/couriers/src/lib/auth/manage-context.ts:6:import { couriersAdmin } from '@/lib/876'
apps/couriers/src/lib/auth/manage-context.ts:7:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/lib/auth/client.ts:3:import { create876Client } from '@876/client'
apps/couriers/src/lib/geo/resolve-region.test.ts:7:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/lib/geo/resolve-region.ts:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/widgets/notepad/route.ts:5:import { widgets876 } from '@/lib/876'
apps/couriers/src/app/api/widgets/notepad/collections/route.ts:5:import { widgets876 } from '@/lib/876'
apps/couriers/src/app/api/widgets/notepad/collections/[id]/route.ts:5:import { widgets876 } from '@/lib/876'
apps/couriers/src/app/api/widgets/notepad/[id]/route.ts:5:import { widgets876 } from '@/lib/876'
apps/couriers/src/app/api/manage/setup/mailbox/route.ts:6:import { couriersAdmin } from '@/lib/876'
apps/couriers/src/app/api/manage/activate/route.ts:4:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/warehouses/route.ts:13:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/warehouses/[id]/route.ts:13:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/tenants/route.ts:7:import { couriersAdmin } from '@/lib/876'
apps/couriers/src/app/api/manage/onboarding/answers/route.ts:8:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/onboarding/complete/route.test.ts:17:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/app/api/manage/onboarding/complete/route.test.ts:20:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/onboarding/complete/route.ts:6:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/onboarding/complete/route.ts:10:import { couriersAdmin } from '@/lib/876'
apps/couriers/src/app/api/manage/onboarding/invites/route.ts:7:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/onboarding/organization/route.test.ts:19:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/app/api/manage/onboarding/organization/route.ts:8:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/addresses/route.ts:13:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/addresses/[id]/route.ts:13:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/roles/route.test.ts:15:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/roles/route.ts:9:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/roles/[id]/route.test.ts:17:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/roles/[id]/route.ts:9:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/geo/countries/route.ts:4:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/geo/countries/[countryCode]/regions/route.ts:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/branches/route.ts:13:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/branches/[id]/route.ts:13:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/team/invites/route.test.ts:15:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/app/api/manage/team/invites/route.test.ts:18:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/team/invites/[inviteId]/route.test.ts:13:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/app/api/manage/team/invites/[inviteId]/route.ts:6:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/team/invites/route.ts:7:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/team/invites/route.ts:11:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/team/[id]/route.test.ts:18:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/team/[id]/route.ts:9:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/customers/[id]/route.test.ts:31:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/customers/[id]/route.ts:9:import { get876Client } from '@/lib/876'
apps/couriers/src/app/api/manage/settings/orgprofile/route.test.ts:12:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/app/api/manage/settings/orgprofile/route.ts:8:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/settings/modules/[moduleKey]/route.ts:10:import { couriersAdmin } from '@/lib/876'
apps/couriers/src/app/api/manage/settings/modules/route.ts:10:import { couriersAdmin } from '@/lib/876'
apps/couriers/src/app/api/manage/settings/orglogo/route.test.ts:9:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/settings/orglogo/route.ts:10:import { storage876 } from '@/lib/876'
apps/couriers/src/app/api/manage/settings/orglogo/complete/route.test.ts:10:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/api/manage/settings/orglogo/complete/route.test.ts:16:vi.mock('@/lib/876/platform-client', () => ({
apps/couriers/src/app/api/manage/settings/orglogo/complete/route.ts:7:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/api/manage/settings/orglogo/complete/route.ts:10:import { storage876 } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/items/_components/items-table-data.test.tsx:15:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/[orgSlug]/items/_components/items-table-data.tsx:9:import { billingIntegration } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/customers/_components/customers-table-data.tsx:3:import { billingIntegration, couriersAdmin } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/customers/_components/customers-table-data.test.tsx:15:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/[orgSlug]/customers/new/page.tsx:6:import { billingIntegration, get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/customers/[id]/_lib/customer-data.test.ts:16:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/[orgSlug]/customers/[id]/_lib/customer-data.ts:5:import { billingIntegration, couriersAdmin, get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/customers/[id]/edit/page.tsx:5:import { billingIntegration, get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/locations/_components/locations-data.test.ts:17:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/[orgSlug]/settings/locations/_components/locations-data.tsx:3:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/locations/new/page.tsx:8:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/locations/[id]/edit/page.tsx:12:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/orgprofile/page.tsx:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/[orgSlug]/settings/warehouses/_components/warehouses-data.tsx:3:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/warehouses/_components/warehouses-data.test.ts:17:vi.mock('@/lib/876', () => ({
apps/couriers/src/app/[orgSlug]/settings/warehouses/new/page.tsx:8:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/warehouses/[id]/edit/page.tsx:12:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/users/_lib/team-roles.ts:4:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/users/(list)/page.tsx:5:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/[orgSlug]/settings/users/(list)/page.tsx:8:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/users/roles/(list)/page.tsx:6:import { get876Client } from '@/lib/876'
apps/couriers/src/app/[orgSlug]/settings/users/roles/[roleId]/page.tsx:12:import { get876Client } from '@/lib/876'
apps/couriers/src/app/onboarding/page.tsx:6:import { getPlatformClient } from '@/lib/876/platform-client'
apps/couriers/src/app/auth/complete/route.ts:9:import { getPlatformClient } from '@/lib/876/platform-client'
```

Exit status: 0 because matches were found. This is a failed migration criterion;
the imports remain intentionally because the authority-preserving migration is
blocked.

## Required package work before retrying

Without prescribing implementation in package-owned files, the app migration
needs bounded, typed capabilities for:

1. Billing integration quote listing under an active organization and the
   published Invoice scopes.
2. Core organization bootstrap at `POST /organizations/bootstrap` under the
   existing first-party/session contract.
3. Core country and region reads at the same existing internal-key/app-key
   authority and paths.

After those package surfaces exist, both app migrations can proceed without an
authority escalation or request-path change.
