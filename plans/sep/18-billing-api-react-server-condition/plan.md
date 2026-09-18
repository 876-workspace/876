# Implementation Plan: Fix Billing API Startup Failure ("billing/unreachable")

## Context & Root Cause Analysis

When visiting `/customers` in 876 Invoice (`apps/invoice`), the UI displays:
```
Active Customers
Billing is unreachable
Please retry shortly. If this persists, contact support.
billing/unreachable
```

### Trace
1. `apps/invoice/src/app/(app)/customers/_components/customers-list-data.tsx` queries `invoice.customers.list({})`.
2. The request goes to `BILLING_API_URL` (`http://127.0.0.1:4004`), which is `@876/billing-api`.
3. `@876/billing-api` failed to start and was not listening on port 4004.
4. When `pnpm dev:invoice` launched `@876/billing-api` via Turbo:
   ```bash
   tsx watch --env-file-if-exists=.env --env-file-if-exists=.env.development --env-file-if-exists=.env.development.local src/server.ts
   ```
   The process crashed immediately with:
   ```
   Error: This module cannot be imported from a Client Component module. It should only be used from a Server Component.
       at Object.<anonymous> (/root/projects/876/node_modules/.pnpm/server-only@0.0.1/node_modules/server-only/index.js:1:7)
   ```
5. **Root Cause**: `@876/billing-api` recently added a dependency on `@876/communications` (`@876/communications/service`). That package declares `import 'server-only'`. Under Node.js, `server-only` throws unless Node runs with the `react-server` condition.
   All sibling services (`@876/work-api`, `@876/projects-api`, `@876/crm-api`, `@876/communications-api`, `@876/couriers-api`) specify `-C react-server` in their `dev` scripts for `tsx watch`.
   `@876/billing-api` had added `options.conditions = ['react-server']` in `tsup.config.ts` and stubbed `server-only` in `vitest.config.ts`, but omitted `-C react-server` from `package.json` scripts that invoke `tsx`.

## Implemented Changes

### 1. `apps/billing-api/package.json`
Added `-C react-server` to all scripts invoking `tsx` so Node loads `server-only` with the `react-server` condition (resolving to empty/no-op):
- `"dev"`: `tsx watch -C react-server --env-file-if-exists=.env --env-file-if-exists=.env.development --env-file-if-exists=.env.development.local src/server.ts`
- `"db:baseline"`: `tsx -C react-server scripts/baseline_migrations.ts`
- `"env:check"`: `tsx -C react-server scripts/check_environment.ts`
- `"cutover:check"`: `tsx -C react-server scripts/check_cutover.ts`
- `"db:reconcile"`: `tsx -C react-server scripts/reconcile_databases.ts`
- `"billing:run"`: `tsx -C react-server src/workers/billing-sweep.cli.ts`
- `"api:contract:check"`: `tsx -C react-server scripts/generate_v1_contract_manifest.ts --check && tsx -C react-server scripts/check_express_contract.ts`
- `"api:contract:generate"`: `tsx -C react-server scripts/generate_v1_openapi_snapshot.ts && tsx -C react-server scripts/generate_v1_contract_manifest.ts`
- `"api:contract:manifest:generate"`: `tsx -C react-server scripts/generate_v1_contract_manifest.ts`
- `"api:contract:manifest:check"`: `tsx -C react-server scripts/generate_v1_contract_manifest.ts --check`

### 2. Contract comparison alignment
- In `apps/billing-api/src/test/openapi-contract.ts`: Exported `INTENTIONAL_ADDITIONS` (the 8 transactional email routes added with `@876/communications`).
- In `apps/billing-api/scripts/check_express_contract.ts`: Imported `INTENTIONAL_ADDITIONS` and passed them into `compareOpenApiContracts(expected, actual, { intentionalAdditions: INTENTIONAL_ADDITIONS })`.
- In `apps/billing-api/src/test/openapi-contract.test.ts`: Imported `INTENTIONAL_ADDITIONS` from `@/test/openapi-contract`.

### 3. Service Verification & Startup
- Launched `pnpm dev:invoice`.
- Port 4004 (`@876/billing-api`), Port 4000 (`@876/api`), Port 3004 (`@876/billing-app`), and Port 3006 (`@876/invoice-app`) are now all active and listening.
- Verified `/health` on port 4004 returns `{"object":"health","status":"ok","service":"@876/billing-api"}` with HTTP 200.

## Verification Results
1. `pnpm --filter @876/billing-api typecheck`: Passed (0 errors).
2. `pnpm --filter @876/billing-api boundaries`: Passed (0 violations across 731 modules).
3. `pnpm --filter @876/billing-api test`: Passed (130 test files, 1,166 tests passed).
4. `pnpm --filter @876/billing-api api:contract:check`: Passed (0 mismatches, 0 extra operations).
5. `curl -i http://127.0.0.1:4004/health`: Returned 200 OK.
