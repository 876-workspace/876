# Brief: Couriers customer-portal gap exploration (read-only)

**Agent:** codex `gpt-5.6-sol`, high reasoning. **Mode: explore and report only — make NO edits, NO commits, NO destructive commands.**

## Why this is needed

We are about to build the consumer-facing customer portal for `apps/couriers` (the multitenant courier SaaS in this monorepo). Shipping companies (tenants) get a hosted portal on their own subdomain/domain where end customers sign up, get assigned a mailbox number + US forwarding address, and track packages. Before implementing, we need a precise map of what already exists versus what is missing. Your findings feed the implementation plan directly — precision matters more than breadth.

## Questions to answer (all of them, with file:line citations)

1. **Tenant resolution:** How is a request's tenant resolved today? Find the `Domain` Prisma model (`apps/couriers/prisma/schema/`), any hostname→tenant lookup (search `hostname`, `host`, `resolveTenant`, `x-forwarded-host` in `apps/couriers/src`), and whether `src/proxy.ts` or any layout does subdomain routing. State exactly what exists and what does not.
2. **Route surface inventory:** For each top-level route group in `apps/couriers/src/app` (`manage/*`, `org/[orgSlug]/*`, `app/[[...rest]]`, `login`, `register`, `get-started`, `onboarding`, `auth/complete`, `callback`, `api/*`), state in 1–3 sentences what it renders/does and which audience it serves (org staff vs consumer customer vs marketing). Identify whether ANY customer-facing portal pages (mailbox display, package tracking, customer signup) already exist.
3. **Auth flows:** How does `apps/couriers` authenticate today? Examine `src/app/api/auth/[...path]/route.ts` and `api/manage-auth`, the realm header used (`X-876-Realm`?), `src/lib/auth/` guards, and the session cookie handling. Is there a consumer-realm login path, or only enterprise/org? Cite exact function names and signatures.
4. **Service layer:** List every resource under `apps/couriers/src/lib/service/` (walk `customer-profiles/`, `tenants/`, and anything else) with its verbs and signatures. Specifically: does a `mailbox` service exist? Is there mailbox-number assignment logic anywhere (search `mailboxPrefix`, `Mailbox`, `assignMailbox`)? Does customer enrollment logic exist (creating a `CourierCustomerProfile` + billing customer link)? Cite `file:line`.
5. **Billing linkage:** How is `billingCustomerId` on `CourierCustomerProfile` populated today? Find where couriers talks to billing (search `billing` under `apps/couriers/src/lib`, incl. `lib/finance/`), and what the billing customer sync in `apps/api` (`db/models/billing_customer_sync.py`, `domains/billing/`) provides.
6. **Org provisioning/entitlement:** How does an org get access to couriers? Find `organization_app_access` or equivalent in `apps/api` (search `app_access`, `provisioning` domain), the couriers-side gate (search `appAccess`, `retrieveBySlug` in `apps/couriers/src`), and `auth/complete` auto-provisioning (`source=register`).
7. **Package model + tracking:** Summarize `package.prisma` and `manifest.prisma` statuses/lifecycle fields relevant to a customer-facing tracking timeline. Does any package service exist under `src/lib/service/`?
8. **876 SDK usage in couriers:** Where is `$876` initialized in couriers (`src/lib/876.ts`?) and which tier (sdk vs admin)? Which `$876` calls exist today?

## Scope bounds

In scope: `apps/couriers`, `apps/api` (only the domains named above), `packages/sdk`, `packages/core` (only auth/session helpers used by couriers). Out of scope: `apps/console`, `apps/enterprise`, `apps/876` internals, `apps/docs`, `apps/billing` UI (only note its client if couriers imports it), `node_modules` except `src/lib/db/generated` for model shapes.

## Return shape (mandatory)

Markdown report with sections numbered 1–8 matching the questions. Every claim cites `path:line`. Exact TypeScript/Prisma signatures for services and models you reference (copy the real signature, do not paraphrase). End with a section **"Gaps for a customer portal"** — a bullet list of concretely missing pieces (e.g. "no hostname→tenant middleware", "no mailbox assignment service"), each with the evidence line that proves absence, and an explicit **NOT FOUND** list for anything you searched for and could not locate.
