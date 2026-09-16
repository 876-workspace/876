## What does this PR do?

Adds transactional email to 876 as a shared platform service, so that an
**organization can send from its own email identity** — invoices and quotes from
876 Billing and 876 Invoice, and shipment notifications from 876 Couriers.

The design follows Zoho, which is the industry reference for this feature: an
organization can send on day one with no setup, and authenticating its own domain
is an upgrade rather than a prerequisite.

```
product service (Billing, Couriers)   owns WHAT is being said and WHY
        ↓ one service-tier call
876 Communications                    owns composition + delivery + evidence
        ↓ provider adapter only
Resend                                owns the wire
```

### Type of change

- [x] New feature
- [x] Bug fix (see "Defects fixed" — the branch did not compile, install, or boot)
- [ ] Breaking change
- [x] Documentation update

## The three sender kinds

An organization must be able to send immediately, so the free identity is the
default and the others are upgrades onto the same record and the same provider
boundary.

| `kind`           | Org setup required          | From address           | DMARC aligns to    |
| ---------------- | --------------------------- | ---------------------- | ------------------ |
| `managed`        | **none** — always available | `<org>@mail.87six.dev` | 876                |
| `custom-domain`  | publish DKIM/SPF            | `billing@acme.com`     | the organization   |
| `linked-mailbox` | OAuth Gmail / Microsoft 365 | the org's real mailbox | the org's provider |

`managed` is backed by **one** provider-verified domain, with per-organization
local parts — so onboarding an organization costs no DNS write and no provider
call. Research supplied an independent commercial reason: the Resend free plan
allows only **3 domains**, so per-organization custom domains break at three
customers.

The address is derived server-side from the organization's durable slug and can
never be supplied by a caller — the input schema has no `email` field at all.
Reserved mailboxes (`postmaster`, `no-reply`, `abuse`, …) are unassignable, and a
platform-wide check guarantees two organizations never share a from-address.

`linked-mailbox` is deliberately **recorded and not built**: no tables, routes,
SDK namespaces, or settings were scaffolded for it.

## Changes made

**New bounded service** — `apps/communications-api` (Express 5, Prisma 7, its own
Neon database) owning sending domains, sender identities, templates, deterministic
rendering, immutable delivery records, provider events, and the Resend adapter.
Cross-context references are opaque ids with no cross-database foreign key.

**New bounded SDK** — `@876/communications` with `service`, `operator` and
`contracts` entrypoints. There is deliberately no `session` entrypoint: a
signed-in user reaches Communications through a host app's own route handler,
which authorizes the session and calls `service` server-side, so the host route is
the session boundary.

**Billing and Invoice** — prepare (side-effect free) and send for invoices and
quotes, on both the tenant and organization-integration surfaces, with a shared
`@876/billing-ui` composer mounted in both hosts. Billing retains all financial
semantics; the legacy record-only `/send` command is unchanged. Sender resolution
now provisions the free identity instead of refusing to send, but a request naming
a sender that does not exist is still an error rather than a silent substitution.

**Couriers** — customers are emailed on `RECEIVED`, `READY_FOR_PICKUP` and
`COLLECTED`. A notification is a side effect of the courier operation and can
never fail, roll back, or 500 a package update; every failure path returns a typed
reason and logs it. The idempotency key is derived from tenant, package and
category, so a package returning to a status it already held does not email twice.

**Two new rules**, mirrored byte-identical into `.agents/rules/`:

- `email.md` — the binding standard: single sender, provider boundary, the three
  sender kinds, rendering safety, idempotency, webhooks, Console jurisdiction, and
  what never goes in an email.
- `external-docs.md` — an external contract is read from current documentation,
  never recalled from training data; a mocked test is not evidence of a wire
  contract; credential **scope** is verified, not just presence.

## Defects fixed

The implementation arrived from an agent that could not execute anything, so
nothing had been installed, compiled, migrated or run. In order of severity:

1. **The built services could not start.** `@876/communications` was absent from
   both services' tsup `noExternal`, and workspace packages publish raw
   TypeScript, so Node resolved `.ts` at runtime and died with
   `ERR_MODULE_NOT_FOUND`. `billing-api` had the same gap and would have failed to
   boot on its next deploy. No source-based check can see this — the repository
   already had `pnpm check:service-bundle` for exactly this failure, documented as
   having taken the API down once before; it was simply never run.
2. **`pnpm install` failed outright** — the lockfile had no importer for either
   new workspace.
3. **254 TypeScript errors**, 27 of them real, against a tsconfig that was
   materially weaker than every other Express service (no vitest globals, no
   `noUncheckedIndexedAccess`, no `verbatimModuleSyntax`). Aligned to the
   canonical config.
4. **A failed sending domain reported `pending` forever.** The provider mapped
   `'failure'`, but Resend documents `'failed'`, so the case never matched and a
   terminal, actionable DNS error was indistinguishable from "still working" — and
   any polling loop keyed on it would never stop. An existing test had locked the
   behaviour in. All six documented statuses are now distinct, with `not-started`
   ("you must act") separated from `pending` ("wait").
5. **The template renderer read inherited properties.** `{{toString}}`,
   `{{constructor}}` and `{{__proto__}}` resolved off the prototype chain, passed
   the `undefined` check, and would have rendered a function body into a customer's
   email instead of failing as a missing variable.
6. **The generated Prisma client was not gitignored** and would have been
   committed.
7. **Environment was read directly in six places** with no config module, against
   `express-api.md`; and the internal-key guard was mounted with `router.use`, so
   an unknown path answered 401 instead of 404 and leaked which paths exist.
8. **Courier templates were appended to an already-applied migration**, which
   would have left them absent from every environment that had run it. Moved to
   their own migration.
9. **One send could address 150 recipients** (50 each across to/cc/bcc) while
   Resend documents 50 and bills every address separately — so a single send would
   have been charged as 150 emails.
10. **Provider error bodies were discarded**, so a restricted key, an unverified
    domain and an exhausted quota were indistinguishable; and 429 was classified
    non-retryable although it is the documented rate-limit response.

## Testing

Local verification is the merge gate per `.claude/rules/deployment.md`.

| Package                   | Typecheck | Tests          | Other                               |
| ------------------------- | --------- | -------------- | ----------------------------------- |
| `@876/communications-api` | 0 errors  | 133            | boundaries clean, builds, **boots** |
| `@876/communications`     | 0 errors  | 23             | —                                   |
| `@876/billing-api`        | 0 errors  | 1166           | boundaries clean                    |
| `@876/couriers-api`       | 0 errors  | 38 in packages | boundaries clean                    |
| `@876/billing-ui`         | 0 errors  | 699            | —                                   |

Repo gates: `check-app-structure`, `check:rsc-boundaries`, `check:transpile`,
`check:error-contract`, `check:service-bundle`, `check:env` all pass.

**Live verification, not only mocks.** The built service was run against the real
Neon database: `/health` and `/ready` respond, an unknown path under `/v1` returns
404 while a real route without credentials returns 401, all five system templates
are present, and provisioning a managed sender is idempotent — a second call with
a different name returns the same id and address. A second organization with the
same slug received a distinct address, and the slug `postmaster` was refused. The
Resend error contract was probed live (422 `validation_error` with the documented
`{statusCode, name, message}` body) without sending an email.

Known **pre-existing** `main` failures, deliberately not fixed here: a
`couriers-api` OpenAPI snapshot drift in unrelated `me-addresses-*` operations,
and 8 `RouteContext` errors in unrelated CRM routes in `billing` and `invoice`
(stale Next generated types).

## Not in this PR

- **Organization custom-domain setup cannot function yet**: the configured Resend
  key is send-only (`restricted_api_key`, verified live) and cannot call the
  domains endpoints. A full-access key is required.
- `mail.87six.dev` is not yet registered with Resend and has no DKIM/SPF records.
  Until it is, `managed` sending is configured but unproven end to end.
- No webhook endpoint is registered, so delivery status does not yet advance past
  `sent`.
- Bounce and complaint suppression, and scheduled reminders.
