# 876 Billing API

Python FastAPI data plane for 876 Billing. This service will own Billing's
database access, financial business logic, integrations, and scheduled work.
The Next.js Billing application remains the presentation layer.

## Development

```bash
pnpm --filter @876/billing-api dev
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api test
```

The canonical versioned API prefix is `/api/v1`. Liveness and readiness are
available at `/health` and `/ready`.
