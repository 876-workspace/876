# @876/api

FastAPI backend for the 876 platform. This app owns database access, provider server calls, serialized API contracts, and internal API routes used by the frontends.

## Runtime

| Field      | Value       |
| ---------- | ----------- |
| Package    | `@876/api`  |
| Path       | `apps/api`  |
| Framework  | FastAPI     |
| Dev port   | 4000        |
| Entrypoint | `main.py`   |
| API router | `api/v1.py` |

## Commands

Run from the repository root:

```bash
pnpm --filter @876/api dev
pnpm --filter @876/api db:bootstrap
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api lint
pnpm --filter @876/api format
```

Run from `apps/api`:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload
python -m pytest
python -m mypy . tests
python -m ruff check .
```

## Database bootstrap

API startup runs schema setup, catalog seeds, and historical backfills through
revision-gated bootstrap phases. A completed phase is recorded in
`platform_bootstrap_state`, so ordinary process starts and Uvicorn reloads only
perform a lightweight revision check. PostgreSQL advisory locking prevents two
replicas from running pending phases concurrently.

When changing a phase's migration, seed definition, or backfill behavior, bump
that phase's revision in `main.get_bootstrap_steps()`. To retry reconciliation
without another code change, run all phases or a selected phase explicitly:

```bash
pnpm --filter @876/api db:bootstrap --force
pnpm --filter @876/api db:bootstrap --force --step feature_catalog
```

Required database phases fail startup when they fail, preventing an unhealthy
schema from reporting ready. External feature-provider reconciliation is
non-blocking and remains pending for a later retry after a failure.

## Local URLs

| URL                                  | Purpose         |
| ------------------------------------ | --------------- |
| `http://localhost:4000`              | API root.       |
| `http://localhost:4000/docs`         | Swagger UI.     |
| `http://localhost:4000/openapi.json` | OpenAPI schema. |

## Domain Routers

| Router          | Source                              | Purpose                                            |
| --------------- | ----------------------------------- | -------------------------------------------------- |
| Health          | `domains/health/router.py`          | Liveness/health endpoints.                         |
| Auth            | `domains/auth/router.py`            | Login, register, session, OTP, recovery.           |
| OAuth           | `domains/oauth/router.py`           | Authorization, token, userinfo, revoke, discovery. |
| Organizations   | `domains/organizations/router.py`   | Organization CRUD and nested memberships.          |
| Memberships     | `domains/memberships/router.py`     | Membership CRUD.                                   |
| Features        | `domains/features/router.py`        | Feature definitions and assignments.               |
| Registered apps | `domains/registered_apps/router.py` | OAuth app registration/resources.                  |
| Users           | `domains/users/router.py`           | User records and Console lookup.                   |

## Frontend Access

Frontend apps call this API through `@876/sdk` with `NEXT_PUBLIC_876_API_URL`
or an explicit client `baseUrl`. Local development defaults to
`http://localhost:4000`.

Console server code calls this app through `API_URL`, defaulting to `http://127.0.0.1:4000`, and uses `x-internal-key` for internal lookups.

## Contract Rules

- Serialized app-owned resources should include Stripe-style `object` discriminators.
- SDK/API results should use `{ data, error }` where the endpoint family uses result envelopes.
- Client-safe errors must not include HTTP status fields.
- App-owned timestamps are Unix seconds.
- Provider errors must be normalized before crossing API boundaries.

See `../../.agents/rules/stripe-api-pattern.md`. Public SDK-facing API schemas are snapshotted in `../../apps/docs/openapi.json`.
