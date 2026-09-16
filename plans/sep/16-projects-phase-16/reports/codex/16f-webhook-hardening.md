# 16f — Webhook transport hardening

## Summary
Fixed all six confirmed defects: DNS-rebinding TOCTOU, redirect following,
incomplete SSRF ranges, unguarded automation `call-webhook`, empty delivery
bodies, and unlocked delivery claims. All webhook sending now flows through a
single hardened `postWebhook` built on `node:https.request` with a pinned-DNS
lookup guard. Verified: `prisma validate`, `prisma generate`, `typecheck`,
`lint`, and the full suite (99 files / 1841 tests) all pass.

## Defects fixed
- **TOCTOU (1):** `assertSafeWebhookUrl` resolved + checked, then `fetch`
  resolved again. The default transport now passes a `lookup` to
  `https.request` that resolves with `{ all: true }`, rejects when **any**
  address is blocked, and returns the first allowed address, so the socket
  connects to the checked address. IP literals are checked directly with no
  DNS at all.
- **Redirects (2):** `https.request` never follows redirects; any 3xx status
  is returned as-is and `attemptDelivery` records it as `webhook-bad-response`
  with the status preserved. Covered by 301/302 drain tests asserting a single
  transport call.
- **Ranges (3):** added `224.0.0.0/4`, `240.0.0.0/4` (incl. `255.255.255.255`),
  `192.0.0.0/24`, `198.18.0.0/15`, `192.0.2.0/24`, `198.51.100.0/24`,
  `203.0.113.0/24`, `ff00::/8`, `64:ff9b::/96` (embedded v4 re-checked),
  `2001:db8::/32`. `::ffff:0:0/96` handling retained.
- **Automation guard (4):** `call-webhook` already called `postWebhook`, so
  the in-transport guard now covers it with no bypass path. Tests prove
  `https://10.0.0.1/hook` and metadata URLs yield
  `automation/webhook-failed` without network.
- **Empty body (5):** deliveries snapshot the event (`event_type` +
  `payload`); the wire body is now
  `{ object, id, type, createdAt, subject: { type, id }, data, deliveryId, attempt }`
  with an exact-shape test.
- **Claim (6):** `claimDueDeliveries` is one atomic
  `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING ...`
  via `Prisma.sql` + `$queryRaw`, including stale-`delivering` recovery
  (`updated_at < now - 300`). All `as unknown as` casts removed from
  `webhooks.repository.ts`.

## Files changed (`apps/projects-api` only)
- `src/platform/ssrf.ts` (new): address logic home; `isBlockedAddress`,
  `assertSafeWebhookUrl`, `checkWebhookUrlSync`, `createSecureLookup`.
- `src/platform/webhook-signature.ts`: `fetch` replaced with
  `node:https.request`; `transport?: (req: WebhookRequest) => Promise<{ status }>`,
  10 s `req.setTimeout` + destroy, 64 KB response cap, sync URL checks.
- `src/modules/webhooks/ssrf.ts`: thin re-export shim over platform.
- `src/modules/automation/webhook.ts`: re-exports platform signer + new types.
- `src/modules/webhooks/webhooks.service.ts`: imports platform guard;
  `enqueueWebhookDeliveries({ id, tenantId, type, subjectType, subjectId, payload, createdAt })`
  stores `eventType` + snapshot payload; `buildWebhookEventBody` for the wire
  shape; drain/attempt use `transport`/`resolver`.
- `src/modules/webhooks/webhooks.repository.ts`: `eventType`/`payload`
  columns, cast-free row mappers, atomic claim + `buildClaimDueDeliveriesQuery`.
- `src/modules/webhooks/webhooks.serializers.ts`: `WebhookDeliveryRow` gains
  `eventType`/`payload`.
- `src/workers/automation.ts`: drain passes the full event snapshot to enqueue.
- `prisma/schema/external-platform.prisma` + `migrations/.../migration.sql`
  (edited in place, unapplied): `event_type TEXT NOT NULL`,
  `payload JSONB NOT NULL DEFAULT '{}'`.
- Tests updated: `webhooks.service.test.ts` (`transport`), `ssrf.test.ts`
  (platform import; `2001:db8::1` now blocked),
  `automation/__tests__/webhook.test.ts` (`transport`),
  `automation.worker.test.ts` (full enqueue snapshot).

## New tests (73 runtime cases)
- `src/platform/__tests__/ssrf-hardening.test.ts` (43): each new v4/v6 range
  plus boundary allows, NAT64 private/public embeddings, lookup rejects on any
  blocked address, IP-literal path without DNS, sync credential/http checks.
- `src/platform/__tests__/webhook-transport.test.ts` (14): timeout/body-cap
  constants, pre-request rejections, injectable transport shape, mocked-https
  200/302-no-follow/timeout-destroy/body-cap-destroy/blocked-DNS.
- `src/modules/webhooks/__tests__/webhook-hardening.test.ts` (10): exact body
  shape, attempt increment, snapshot enqueue, 301/302 recorded singly,
  timeout/blocked transport failures, automation private/metadata blocks.
- `src/modules/webhooks/__tests__/webhook-claim.test.ts` (6): `FOR UPDATE
  SKIP LOCKED`, `delivering` marking + 300 s recovery, attempt budget,
  backoff/ordering, `RETURNING`.

## Verify
- `prisma validate` — valid.
- `prisma generate` — ok.
- `typecheck` — EXIT 0.
- `lint` — EXIT 0, no warnings.
- `test` — 99 files / 1841 tests pass; targeted 7 files / 145 pass.
