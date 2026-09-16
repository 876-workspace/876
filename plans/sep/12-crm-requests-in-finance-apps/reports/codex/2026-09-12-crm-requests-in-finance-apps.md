# CRM requests in finance apps — implementation report

## Status

| Phase                                          | Status      | Evidence / added coverage                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — CRM API and service authentication         | Implemented | Service-app authentication, billing-customer request endpoints, tenant-scoped customer resolution, related-resource persistence/filtering/serialization, and migration are present. `service-auth.test.ts`: 11; `requests.billing-customer.routes.test.ts`: 8. |
| B — `@876/crm` contracts and service transport | Implemented | Typed service transport, billing-customer list/create methods, related-resource filters, snapshots, and source-app contracts. `requests.billing-customer.test.ts`: 14.                                                                                         |
| C — `@876/crm-ui` presentation                 | Implemented | Customer request, composer, related-request, list/detail, record, and task presentation subpaths. `customer-requests-surfaces.test.tsx`: 20.                                                                                                                   |
| D — Invoice and Billing hosts                  | Implemented | Guarded CRM BFFs, split request routes, task/activity routes, invoice/payment related-request panels, and catalog bindings. This run adds 14 customer-route, 12 task/activity, and 8 related-request cases.                                                    |
| E — CRM app and Console integration            | Implemented | CRM uses the live shared customer panel. Console now renders attribution and financial linkage in queue and record. `request-attribution.test.tsx`: 5.                                                                                                         |
| F — Finance full request UX                    | Implemented | Persistent split view, overview, tasks, activity, shared record presentation, and guarded mutations exist in both finance apps.                                                                                                                                |
| G — remaining UX gaps                          | Implemented | Orchestrator-fixed guards/value-error handling remain intact; tabs and related invoice/payment surfaces are present.                                                                                                                                           |
| H — Console rendering and owed tests           | Implemented | Centralized Console attribution and all five requested coverage groups: 47 focused `it()` cases.                                                                                                                                                               |

## Test counts by file

| File                                                                                   | `it()` cases |
| -------------------------------------------------------------------------------------- | -----------: |
| `apps/crm-api/src/http/service-auth.test.ts`                                           |           11 |
| `apps/crm-api/src/modules/requests/__tests__/requests.billing-customer.routes.test.ts` |            8 |
| `packages/crm/src/resources/requests.billing-customer.test.ts`                         |           14 |
| `packages/crm-ui/src/customer-requests-surfaces.test.tsx`                              |           20 |
| `packages/core/src/access/catalogs.billing-invoice.test.ts`                            |           17 |
| `apps/invoice/src/app/api/customers/[customerId]/requests/route.test.ts`               |            7 |
| `apps/billing/src/app/api/customers/[customerId]/requests/route.test.ts`               |            7 |
| `apps/invoice/src/app/api/requests/tasks-and-activity.test.ts`                         |            6 |
| `apps/billing/src/app/api/requests/tasks-and-activity.test.ts`                         |            6 |
| `apps/invoice/src/app/(app)/_components/related-requests-client.test.tsx`              |            4 |
| `apps/billing/src/app/(app)/_components/related-requests-client.test.tsx`              |            4 |
| `apps/console/src/features/crm/request-attribution.test.tsx`                           |            5 |

Brief 5 adds 47 cases: 14 customer-route, 12 task/activity, 8 related-request,
5 Console rendering, and 8 CRM API billing-customer-route cases.

## Files changed

- `apps/crm-api/prisma/schema/request.prisma`, the migration, `src/types/**`,
  `src/http/{routes,service-auth}.ts`, and `src/modules/{customers,requests}/**`:
  tenant-scoped billing-customer lookup, service credentials, related-resource
  fields, filtering, persistence, and serialization.
- `apps/crm-api/src/modules/{categories,events,notes,priorities,reminders,request-forms,tasks,teams}/*.routes.ts`:
  existing organization routes continue to accept CRM's service credential.
- `packages/crm/src/{index,request,request-types,runtime,service-client,types}.ts`
  and `resources/{customers,requests}.ts`: typed contracts and billing-customer
  resource methods.
- `packages/crm-ui/src/{customer-requests-panel,related-requests-panel,request-composer,request-detail-card,request-list-detail-shell,request-record,request-tasks}.tsx`:
  shared presentation-only request surfaces.
- `packages/core/src/access/{catalogs.ts,catalogs.billing-invoice.test.ts}`:
  finance request permissions and binding coverage.
- `apps/{invoice,billing}/src/lib/services/crm.ts`, customer request routes,
  request BFF routes, and invoice/payment pages: authenticated finance hosts.
- `apps/crm/src/app/(app)/customers/**` and `apps/crm/src/lib/services/crm.ts`:
  shared live customer requests.
- `apps/console/src/features/crm/{request-attribution.tsx,request-attribution.test.tsx,request-list-rows.ts,components/requests-list.tsx,components/request-aside.tsx}`:
  centralized source names plus muted attribution and related-record rendering.
- CRM API, CRM, Console, Invoice, and Billing `.env.example` files: service
  variable declarations.

## Migration SQL

```sql
ALTER TABLE "crm_requests"
  ADD COLUMN "related_resource_type" text NULL,
  ADD COLUMN "related_resource_id" text NULL,
  ADD COLUMN "related_resource_snapshot" jsonb NULL,
  ADD COLUMN "source_app" text NULL;

CREATE INDEX "crm_requests_tenant_id_related_resource_type_related_resource_id_idx"
  ON "crm_requests" ("tenant_id", "related_resource_type", "related_resource_id");
```

## Decisions

- `crm_requests` is the physical table name, so the migration uses it.
- CRM API derives `sourceApp` solely from a validated service credential; an
  internal-key caller stays unattributed (`null`) and request bodies cannot set it.
- Related snapshots are display-only; money is a string (or permitted integer
  minor units), never a JavaScript money number.
- Console has one source slug/name mapping. Missing source or related data is a
  tier-3 muted em dash; a related record uses its type label plus snapshot number,
  falling back to id.
- Finance handlers remain adapters: permission, validation, one typed CRM call,
  and the original `{ data, error }` envelope.

## Verification and remaining work

- Before this brief, the orchestrator verified all package typechecks and CRM API
  775, CRM 247, CRM UI 25, and Core 1,098 tests.
- No Prisma migration or generator command was run in this brief.
- Passed focused tests: Console attribution (5), CRM API billing-customer routes
  (8), Invoice route/component coverage (17), and Billing route/component
  coverage (17). Console, Invoice, Billing, and CRM API typechecks passed; CRM
  API used direct `tsc --noEmit` so its generator-running package script was not
  invoked.
- Package-wide test suites remain for the staging workflow.
- No product-scope work is deliberately left from Phases A–H. The remaining risk
  is final clean verification of the focused BFF and component suites.
