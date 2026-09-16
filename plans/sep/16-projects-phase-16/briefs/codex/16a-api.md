# Brief 16a — Projects API: integration tier, webhooks, CSV import/export, importers, metrics

Repo `/root/projects/876`. Read `plans/sep/16-projects-phase-16/plan.md` — binding; also phase 13 (outbox, `src/modules/automation/webhook.ts` signer) and phase 10 (reports CSV serializer).
Rules: `.claude/rules/express-api.md`, `access-tiers.md`, `sdk-conventions.md`, `naming.md`, `error-handling.md`, `testing.md`, `external-docs.md`, `ai-code-quality.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification at a time. Touch only `apps/projects-api/**`, `packages/projects/**`.

## Deliver
1. Migration `prisma/migrations/20260928000000_external_platform/migration.sql`: integration clients (name, scopes text[], hashed secret, lastUsedAt, revokedAt), webhook endpoints (https url, event types, sealed secret, enabled, consecutiveFailures), webhook deliveries (endpoint, eventId, attempt, status, responseCode, nextAttemptAt; unique endpoint+event), import jobs + import job rows (status, errors JSON, unmapped report).
2. Integration guard: `Authorization: Bearer <clientId>.<secret>`, hashed-secret compare via `secretsMatch` from `src/http/internal-auth.ts`, resolves tenant, per-route scope (`projects:read|projects:write|time:read|time:write|webhooks:manage`), revoked → 401, per-client rate limit. Routes `/v1/integration/{projects,work-items,phases,time-entries,webhook-endpoints}` calling existing services only; OpenAPI registration from Zod with stable operation ids.
3. Webhooks: consume the phase-13 outbox in the same drain (`src/workers/automation.ts` → add a webhook delivery step, no second producer). Move the signer to `src/platform/webhook-signature.ts` and point automation + webhooks at it. SSRF guard resolving DNS and rejecting loopback, private, link-local, CGNAT, unique-local IPv6, and cloud metadata addresses. Exponential retries max 8; auto-disable after 20 consecutive failures; internal replay endpoint.
4. Imports: `POST /import-jobs` (sources `csv|jira-csv|jira-json|trello-json|asana-csv|zoho-csv`, ≤ 5 MB text) → pure mappers `src/modules/imports/mappers/*.ts` to one `ImportBundle` → preview with per-row errors + unmapped-field report → `POST /import-jobs/:id/commit` in batches of 200 through existing services, idempotent per job+row. Each mapper cites its vendor export doc URL in a comment; if a format can't be verified from docs, say so in the report instead of guessing.
5. Exports: `GET /exports/work-items.csv`, `/exports/time-entries.csv` reusing the reports CSV serializer + injection guard.
6. Metrics: `GET /internal/metrics/summary` — counts and failure rates for automation runs, webhook deliveries, import jobs over 24h/7d; pino structured events per subsystem, no payload bodies.
7. `@876/projects/integration` entrypoint + resources (`integration-clients`, `webhook-endpoints`, `import-jobs`, `exports`, `metrics`) + tests.
8. Test floor **≥ 110 api, ≥ 25 package**: scope per route, revoked client, SSRF range table, signature bytes, retry schedule, auto-disable, each mapper on fixtures, unmapped report, idempotent commit, CSV guard, tenant isolation.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/sep/16-projects-phase-16/reports/codex/16a-api.md`.
