# @876/couriers-api

## What this service owns

This service serves couriers' operational data to consumers that cannot share the Next.js process: the customer portal, a counter kiosk, a driver app, a warehouse app, and Console. Today it exposes `health` and `tenants`; more modules follow.

## Running it locally

Run the development server on port 4001 using the `dev` script from `package.json`:

```bash
pnpm dev
```

Or from the repository root:

```bash
pnpm --filter @876/couriers-api dev
```

## Environment

| Variable                | Required | Purpose                                                       |
| ----------------------- | -------- | ------------------------------------------------------------- |
| `PORT`                  | No       | HTTP server port (defaults to 4001).                          |
| `ENVIRONMENT`           | No       | Execution environment name (defaults to production).          |
| `LOG_LEVEL`             | No       | Pino logging level (defaults to info).                        |
| `DATABASE_URL`          | Yes      | Prisma Accelerate URL for database access.                    |
| `DIRECT_DATABASE_URL`   | No       | Direct database connection URL for Prisma schema generator.   |
| `API_876_KEY`           | Yes      | Public platform API key accepted by `requireApiKey`.          |
| `API_INTERNAL_KEY`      | No       | Secret internal key for admin authorization (`requireAdmin`). |
| `SESSION_COOKIE_SECRET` | Yes      | Secret used for session cookie verification.                  |
| `SENTRY_DSN`            | No       | Sentry Data Source Name for error reporting.                  |
| `CORS_ALLOWED_ORIGINS`  | No       | Comma-separated list of allowed CORS origins.                 |

## Project layout

```text
src/
├── config/ - Environment schema parsing and frozen settings object
├── db/ - Prisma database client singleton and generated schema client
│   └── generated/ - Prisma generated client files
├── http/ - Express app setup, routing, envelope, and error middleware
│   ├── auth/ - Authentication credentials, principal resolution, and auth guards
│   ├── middleware/ - Request context, envelope, validation, and error handlers
│   └── openapi/ - OpenAPI specification generator and route registry
├── modules/ - Domain modules containing routes, controllers, services, and repositories
│   ├── health/ - Health check liveness probe module
│   └── tenants/ - Tenant operational data module
├── platform/ - Cross-module primitives for logging, JWT verification, IDs, errors, and timestamps
└── test/ - Test setup and testing utilities
```

## Auth tiers

| Guard            | Credential                                            | Grants                                                                            |
| ---------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `requireApiKey`  | `X-876-API-Key` or `X-API-Key` header                 | Valid API key access; sets `req.principal.appId` and `req.principal.apiKeyId`.    |
| `requireSession` | Bearer access token (`Authorization: Bearer <token>`) | User session access; requires a valid access token with `token_use === 'access'`. |
| `requireAdmin`   | `x-internal-key` header                               | Privileged operations; requires internal secret key matching `API_INTERNAL_KEY`.  |

Guards attach per route rather than with `router.use`, so an unknown path returns 404 instead of 401.

## Database

This service reads the existing couriers database owned by `apps/couriers/prisma/`. Models carry `@@map`/`@map` attributes because the database is snake_case and the client is camelCase. No migration here creates tables.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm boundaries
```
