# Brief: Customer portal Part 2 — tenant-branded portal UI (implementation)

**Agent:** codex `gpt-5.6-sol`, high reasoning. **You may create/edit files in `apps/couriers` only. Do NOT commit, do NOT touch git, do NOT edit prisma schema files, do NOT modify the Part 1 files listed below except where explicitly allowed, do NOT edit other apps/packages.**

## Context — Part 1 is merged into the working tree (verified, rely on it)

- `getPortalTenant(): Promise<Tenant | null>` — React-cached hostname→tenant resolution (verified domain → platform subdomain → dev `PORTAL_DEV_TENANT_SLUG`), ACTIVE tenants only (`src/lib/portal/tenant.ts`).
- `ensurePortalCustomer(params: PortalCustomerEnsureParams): EnsurePortalCustomerResult` — idempotent enrollment returning profile + `primaryMailboxNumber` (`src/lib/portal/enroll.ts`; types in `src/types/portal.ts`).
- `service.mailboxes.list({ tenantId, customerId })`, `service.packages.list({ tenantId, customerId })` (newest-first, includes carrier/branch/mailbox summaries), `service.packages.retrieve({ tenantId, id })` (`src/lib/service/`).
- `GET /portal/auth/complete` route exists (`src/app/portal/auth/complete/route.ts`): session → tenant → enroll → redirects to sanitized `return_to` (must start `/portal`); failure → `/portal/login?error=enrollment`; no tenant → `/portal/unavailable`. **Do not modify it.**
- `GET /api/portal/packages` exists. Session helpers: `getAuthSession()` / `isSignedSession()` (`src/lib/auth/session.ts`). Consumer-realm auth transport already exists: `authClient = create876Client({ baseUrl: '/api' })` (`src/lib/auth/client.ts`) hitting the consumer bridge `src/app/api/auth/[...path]/route.ts`.
- Embedded auth UI: `@876/ui/auth` `AuthMode = 'consumer' | 'enterprise' | 'business-onboarding'`. Study `src/app/login/page.tsx` + `src/app/login/embedded-auth.tsx` (enterprise staff login) and `src/app/register/business-onboarding.tsx` and mirror their wiring for a **consumer**-mode variant using `authClient`.
- `PackageStatus` lifecycle: `PRE_ALERT → RECEIVED → IN_TRANSIT → ARRIVED → READY_FOR_PICKUP → COLLECTED | UNCLAIMED` (`prisma/schema/package.prisma`; Zod enums in `src/types/package.ts`).
- `Warehouse` model: read `prisma/schema/warehouse.prisma` and the generated client for its address fields — warehouses belong to a tenant and hold the US forwarding address.

## Rules (read first)

`.agents/rules/code-style.md`, `.agents/rules/types.md`, `.agents/rules/sdk-conventions.md` (service layering + verb vocabulary), `.agents/rules/api-access.md` (no server actions; client mutations via thin route handlers). UI copy rule from root `AGENTS.md`/CLAUDE.md: **no wordy subheadings/description paragraphs; empty states are a short title only. No green buttons** (green = status badges only). The admin sidebar layout rules do NOT apply — the portal is a customer-facing consumer surface: build a clean, minimal, mobile-first layout (simple top header, content max-width container), visually distinct from the staff app. Use `@876/ui` primitives (see how existing pages import them) and Tailwind v4 tokens already in the app.

## Industry baseline being implemented (from market research)

The v1 slice = signup → mailbox + copyable US address card → package tracking timeline. (Pre-alerts, payments, rate calculator, notifications are explicitly out of scope.)

## Deliverables

### 1. `service.warehouses` read — `src/lib/service/warehouses/`

`list.ts` — `list(params: { tenantId: string })` returning tenant warehouses (plain values, active/primary-first if the model has such flags — follow the schema). `index.ts` composing it; register in `src/lib/service/index.ts` (this edit to the service index is allowed).

### 2. Portal layout + shared chrome — `src/app/portal/layout.tsx` (+ small components under `src/components/portal/`)

- Resolve tenant via `getPortalTenant()`. If `null`: render nothing fancy — but note `layout.tsx` wraps ALL portal routes including `/portal/unavailable`, so do the tenant gate carefully: either allow `/portal/unavailable` through, or (simpler) put the tenant requirement in a `(tenant)` route group layout and leave `unavailable` outside it.
- Header: tenant `name` as the brand, nav links (Dashboard, Packages), session-aware right side (sign-in link vs a simple account menu/sign-out). Check how sign-out works elsewhere in the app (`logout`?) and reuse the same transport; if the app has no reusable sign-out, link to the consumer bridge logout path the same way existing surfaces do.
- Footer: minimal ("Powered by 876" style single line is fine).

### 3. Pages (all RSC-first; client components only where interactivity demands)

- `src/app/portal/unavailable/page.tsx` — short "This portal isn't available" page.
- `src/app/portal/login/page.tsx` + client auth component — consumer-mode embedded auth via `authClient`, success → `/portal/auth/complete` (pass through a `return_to` param when present, using the same `AUTH_RETURN_TO_PARAM` constant from `@876/core/auth/return-to` that `auth/complete` reads). Support `?error=enrollment` by showing a short error notice.
- `src/app/portal/register/page.tsx` — same component in sign-up-first presentation (check what the auth UI supports for defaulting to registration; if it has no such toggle, one page handling both is acceptable — then make `/portal/register` redirect to `/portal/login`).
- `src/app/portal/page.tsx` — **dashboard.** Require session (`getAuthSession`/`isSignedSession`; unsigned → `redirect('/portal/login')`). Require enrollment via `service.customerProfiles.retrieveByTenantAndUser`; if missing → `redirect('/portal/auth/complete')` (it enrolls and bounces back). Content:
  - **US shipping address card** — the flagship element. Compose from the tenant's first warehouse (via `service.warehouses.list`) + the customer's primary mailbox number (via `service.mailboxes.list`): full name line, Address Line 1 = warehouse street, **Address Line 2 = mailbox number** (the retailer "address 2" convention), city/state/zip. Each line gets a copy-to-clipboard affordance (one small client component; `navigator.clipboard`, with a copied check-state that must not be a green button — an icon/badge state is fine). If the tenant has no warehouse yet, show the mailbox number card alone with a short "address pending" line.
  - **Recent packages** — up to 5 from `service.packages.list`, each row: description/tracking number, status badge, date. Link to `/portal/packages`. Short-title empty state.
- `src/app/portal/packages/page.tsx` — full package list (same guards as dashboard). Status badge colors: green ONLY for `READY_FOR_PICKUP`/`COLLECTED` badges (status indication is the sanctioned green), neutral/info tones elsewhere.
- `src/app/portal/packages/[id]/page.tsx` — package detail: guards, fetch via `service.packages.retrieve({ tenantId, id })`, **verify `package.customerId` equals the signed-in customer's profile id — otherwise `notFound()`**. Render a vertical status timeline derived from the `PackageStatus` order (`PRE_ALERT → RECEIVED → IN_TRANSIT → ARRIVED → READY_FOR_PICKUP → COLLECTED`, with `UNCLAIMED` as a terminal exception state), marking reached vs pending stages from the current status; show tracking number, carrier, branch, weight/description fields as available on the model, and `collectedAt` when set.

### 4. Types

Any shared portal view contracts go in `src/types/portal.ts` (extend, don't duplicate). Status-timeline ordering helper can live in `src/lib/portal/` (server-safe pure module) with its type in `src/types/portal.ts` if exported.

## Out of scope

Pre-alerts, payments/invoices, rate calculator, notifications, branch picker, profile editing, staff app changes, prisma changes, proxy changes, other apps/packages.

## Verification (must pass; fix what you break)

```bash
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
```

Do not write new tests (separate pass follows); do not weaken existing ones.

## Return shape

Files created/changed with one-line purposes; deviations + why; typecheck/test output tail; open questions.
