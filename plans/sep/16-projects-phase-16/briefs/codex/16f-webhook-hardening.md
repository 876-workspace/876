# Brief 16f — Webhook transport hardening (security fix)

Repo `/root/projects/876`. No commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; do not add `as unknown as`. Touch only `apps/projects-api/**`. The migration `prisma/migrations/20260928000000_external_platform/migration.sql` is **not yet applied** — edit it in place.

## Defects (all confirmed by the orchestrator)
1. **DNS rebinding / TOCTOU:** `assertSafeWebhookUrl` resolves and checks, then `postWebhook` calls `fetch`, which resolves again.
2. **Redirects:** `fetch` follows redirects by default; a public URL can 30x to an internal address.
3. **Incomplete ranges** in `src/modules/webhooks/ssrf.ts`: missing 224.0.0.0/4, 240.0.0.0/4 (incl. 255.255.255.255), 192.0.0.0/24, 198.18.0.0/15, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, IPv6 ff00::/8, 64:ff9b::/96 (check embedded v4), 2001:db8::/32, ::ffff:0:0/96 already handled.
4. **Automation `call-webhook`** (`src/workers/automation.ts` → `postWebhook`) has no SSRF guard at all.
5. **Empty webhook body:** `attemptDelivery` sends `eventType: '*'` and no event data.
6. **Unlocked delivery claim:** `claimDueDeliveries` uses `findMany`; overlapping drains send duplicates. It also uses `as unknown as`.

## Required design
- Move the address logic to `src/platform/ssrf.ts` (platform may not import modules). `webhooks` and the signer import it; update imports/tests; keep `modules/webhooks/index.ts` re-export only if still used.
- Replace `fetch` in `src/platform/webhook-signature.ts` `postWebhook` default transport with `node:https.request`:
  - https only; reject URL credentials;
  - if host is an IP literal, check it directly; otherwise pass a `lookup` option that resolves with `{ all: true }`, rejects the connection if **any** resolved address is blocked, and returns the first allowed address — so the connect uses the checked address (no second resolution);
  - never follow redirects: any 3xx is a failed delivery with its status recorded;
  - 10 s total timeout (`req.setTimeout` + destroy), response body read capped at 64 KB and discarded;
  - keep an injectable transport for tests (replace `fetchImpl` with `transport?: (req: WebhookRequest) => Promise<{ status: number }>`), and add tests for the real transport's lookup guard by unit-testing the exported lookup function with a fake resolver.
- `postWebhook` is the only way both automation and endpoint deliveries send; both therefore get the guard.
- Deliveries snapshot the event: add `event_type TEXT NOT NULL` and `payload JSONB NOT NULL DEFAULT '{}'` to `projects_webhook_deliveries` (migration + Prisma). `enqueueWebhookDeliveries` receives `{ id, tenantId, type, subjectType, subjectId, payload, createdAt }` from the worker and stores it. Body: `{ object: 'projects.webhook-event', id: eventId, type, createdAt, subject: { type, id }, data: payload, deliveryId, attempt }`.
- Claim atomically in the repository with raw SQL: `UPDATE projects_webhook_deliveries SET status='delivering', updated_at=$now WHERE id IN (SELECT id FROM projects_webhook_deliveries WHERE (status IN ('pending','scheduled') AND attempt < 8 AND (next_attempt_at IS NULL OR next_attempt_at <= $now)) OR (status='delivering' AND updated_at < $now - 300) ORDER BY created_at, id LIMIT $limit FOR UPDATE SKIP LOCKED) RETURNING ...` mapped to a typed row without casts.
- Tests ≥ 35 new: every added range (v4 + v6 incl. NAT64 embedding private/public), lookup guard rejects when any address blocked, IP-literal path, 3xx not followed and recorded as failure, timeout, body cap, automation call-webhook blocked for private URL, payload shape exact, claim SQL contains `FOR UPDATE SKIP LOCKED` and stale `delivering` recovery.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test

## Report
`plans/sep/16-projects-phase-16/reports/codex/16f-webhook-hardening.md`.
