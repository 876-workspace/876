# Orchestrator adversarial review — transactional email platform

Reviewer: Claude (orchestrator), 2026-09-16.
Subject: `feature/transactional-email-platform`, 114 commits by GPT web, ~9,200 lines.

## Verdict on GPT web's direction

**Agree with the architecture.** The load-bearing decisions are correct and
match the repository's own rules rather than being invented:

| Decision                                                                                       | Assessment                                                                                                      |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Communications as its own bounded service + SDK, not in `apps/api`                             | **Correct.** `platform-services.md` decision step #3 puts cross-surface messaging in the shared-service bucket. |
| Provider knowledge confined to `src/providers/**`; no product app holds a Resend key           | **Correct** and verified — no `resend` import outside the adapter, and no npm `resend` dependency (raw REST).   |
| Billing keeps financial semantics; Communications only composes and delivers                   | **Correct.** Avoids the duplicate-owner failure `ai-code-quality.md` targets.                                   |
| Prepare/render side-effect free; send explicit                                                 | **Correct**, and the composer depends on it.                                                                    |
| Local idempotency canonical, provider key defence in depth                                     | **Correct.**                                                                                                    |
| Provider acceptance before Billing lifecycle record, recovered by a deterministic delivery key | **Correct and well documented at the call site.** This is the subtle one and it was reasoned properly.          |
| Immutable delivery snapshots as evidence                                                       | **Correct.**                                                                                                    |
| No `session` SDK alias invented for an authority the backend does not implement                | **Correct restraint.**                                                                                          |

Its honesty was also accurate: it claimed no verification, and none had run.

## What only execution found

Nothing in the branch had ever been compiled, installed, or migrated.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Severity          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | `pnpm-lock.yaml` had no importer for either new workspace — `pnpm install` failed outright with `ERR_PNPM_OUTDATED_LOCKFILE`.                                                                                                                                                                                                                                                                                                                                                                                                                                      | blocker           |
| 2   | 254 TypeScript errors. 227 were missing vitest globals; 27 were real (wrong imported contract type names, untyped merged route params, a Prisma JSON input type, a test generic arity).                                                                                                                                                                                                                                                                                                                                                                            | blocker           |
| 3   | `apps/communications-api/tsconfig.json` was materially weaker than the canonical `apps/billing-api` one — no `types: ["node","vitest/globals"]`, no `lib`, no `noUncheckedIndexedAccess`, no `verbatimModuleSyntax`, no `isolatedModules`. Aligned to the platform standard by the orchestrator; the 27 real errors are counted against the aligned config.                                                                                                                                                                                                        | high              |
| 4   | The generated Prisma client at `apps/communications-api/src/db/generated/` was **not gitignored** — it would have been committed. Fixed in the root `.gitignore` beside the other five services.                                                                                                                                                                                                                                                                                                                                                                   | high              |
| 5   | Six direct `process.env` reads and **no `src/config/` module**, violating `express-api.md` ("parse environment variables once through the service config module … other modules do not read `process.env` directly").                                                                                                                                                                                                                                                                                                                                              | high              |
| 6   | The internal-key guard was attached with `service.use(requireInternalKey)`, so an unknown path under `/v1` answered **401 instead of 404** — the exact thing `express-api.md` forbids.                                                                                                                                                                                                                                                                                                                                                                             | medium            |
| 7   | Default `PORT` was 4040, already owned by `@876/commerce-api`. Reassigned to **4050**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | medium            |
| 8   | **Renderer reads inherited properties.** `templates.renderer.ts` does a bare `variables[key]`, and the placeholder pattern `[a-zA-Z0-9._-]+` matches `toString`, `constructor`, and `__proto__`. Those resolve off the prototype chain, so `value === undefined` is false and `String(value)` renders a function body or `[object Object]` **into a customer-facing email** instead of failing as a missing variable. `__proto__` is in `testing.md`'s required security corpus, so this is exactly the case the standard asks to be tested. Fix: `Object.hasOwn`. | high              |
| 9   | `to` + `cc` + `bcc` are capped at 50 **each**, so up to 150 recipients per send. Resend's documented per-send recipient cap is lower; needs one combined cap validated against the live contract.                                                                                                                                                                                                                                                                                                                                                                  | medium            |
| 10  | `html` has `min(1)` and **no maximum** — bounded only incidentally by the 1 MB Express body limit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | low               |
| 11  | Plan deferred the org email settings UI "until a session-authority Communications API exists". **Unnecessary** — per `app-api-routing.md` the host app's own route handler _is_ the session boundary; it authorizes the session and then calls the `service` entrypoint server-side. No session tier is needed in Communications.                                                                                                                                                                                                                                  | design correction |

## What survived review unchanged (verified, not assumed)

- **Webhook signature verification** (`resend-webhook.ts`) is correct: Svix
  `id.timestamp.payload` signing string, base64-decoded `whsec_` secret,
  HMAC-SHA256, 300 s tolerance, length check before `timingSafeEqual`, and
  multiple space-separated `v1,` candidates handled.
- **Raw body ordering** is correct: `express.raw({type:'application/json'})` is
  registered on `/webhooks/resend` _before_ `express.json()`, and the handler
  asserts `Buffer.isBuffer(req.body)`.
- **Status regression protection** is correct: terminal states
  (bounced/complained/failed) win and are never overwritten by a later progress
  event.
- **Internal-key auth** hashes both sides then compares in constant time and
  **fails closed** when the configured key is empty.
- **Org scoping is path-derived** (`/organizations/:organizationId/email/...`),
  never taken from a client-supplied body or query field. The 21 TS2339s were a
  typing gap, not an authorization gap, and the runtime guards were kept.
- **Sender ownership is validated at send time**, not only at prepare:
  `deliveries.service.ts` resolves the sender scoped to the organization and
  rejects an inactive one, so cross-organization sender use is blocked.
- **Route authorization** is properly tiered: tenant routes require
  `sales:read` / `sales:write`, integration routes require named
  `billing.invoices.*` / `billing.quotes.*` scopes.

## Decisions taken by the orchestrator

1. **A free, zero-setup sending identity for every organization** (the user's
   explicit ask, and what Zoho actually does — it sends on your behalf by default
   and only then offers address or domain verification). Mailchimp is the opposite
   model and deliberately **not** copied: it requires domain authentication before
   you can send at all, which is a worse onboarding path.

   Implemented as the `managed` sender kind, which already existed in the enum and
   the nullable `domainId` column but was rejected by `createSender`. One verified
   platform domain (`mail.87six.dev`), per-organization **local part and display
   name**, reply-to the organization's own address. This costs zero DNS writes and
   zero provider calls per organization — a per-organization subdomain would need
   both.

2. **`linked-mailbox` (Gmail / Microsoft 365 OAuth) is recorded as the third
   delivery method and deliberately not built.** It belongs behind the same
   provider boundary when it arrives. Per `billing-commercial-platform.md`'s
   reserved-boundary rule, no tables, routes, SDK namespaces, or settings are
   scaffolded for it now.

3. **Kept the identifier `managed`** rather than renaming to `platform-shared`.
   It is already in the enum and the persisted column; a rename would be churn
   against `naming.md`'s durable-identifier rule for no gain.

4. **Two new rules written and mirrored byte-identical** into `.agents/rules/`:
   - `email.md` — the binding email standard (ownership, the three sender kinds,
     rendering safety, idempotency, webhooks, Console jurisdiction, what never
     goes in an email).
   - `external-docs.md` — the user's explicit ask: an external contract is read
     from current documentation, never recalled from training data; a mocked test
     is not evidence of a wire contract; credential **scope** is checked, not just
     presence.

## Infrastructure provisioned

| Item                          | Value                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Neon project                  | `876-communications` (`tiny-moon-24025044`), aws-us-east-1, pg 17                  |
| Migration                     | `20260915220000_transactional_email_foundation` applied                            |
| Vercel project                | `876-communications-api`                                                           |
| Vercel env (prod/preview/dev) | pooled + direct database URL, minted internal key, `ENVIRONMENT`, `RESEND_API_KEY` |
| `apps/billing-api` env        | `COMMUNICATIONS_API_URL`, `COMMUNICATIONS_INTERNAL_KEY` (Vercel + local)           |
| Local                         | `apps/communications-api/.env` (gitignored, verified)                              |

### Open infrastructure items

- **The supplied Resend key is send-only** (`restricted_api_key`: "This API key is
  restricted to only send emails"). It cannot call the domains endpoints, so
  **organization custom-domain setup and verification cannot work with it**. A
  full-access key is required for that half of the feature.
- **`mail.87six.dev` is not registered with Resend and has no DNS records.**
  `87six.dev` is registered with DNS on Cloudflare (`adel`/`miles.ns.cloudflare.com`),
  so DKIM/SPF can be published programmatically once the domain is created in
  Resend with a full-access key.
- Until both are done, `managed` sending is configured but unverified end to end.
