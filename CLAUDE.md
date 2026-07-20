# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Platform & Ecosystem

876 is **one identity that unlocks many product apps.** A single 876 account (consumer or enterprise) signs a user into every 876 surface. The FastAPI core (`@876/api`) owns identity, accounts, organizations, OAuth, and platform data; product apps build their own domains on top of it.

**Auth is embedded, not centralized.** Each app hosts its own email-first login UI (built on `@876/ui/auth`) and authenticates **directly** against the FastAPI core through its own thin `/api/auth` bridge route — there is no central auth app to redirect to. The API seals the session and sets the cookie on each app's own origin. (Social/SSO, which needs a provider-registered callback, is deferred.)

- **`@876/app`** — the user-facing app where consumers and enterprise members manage their account and access features. Hosts consumer-mode embedded auth.
- **`@876/enterprise`** — the enterprise org workspace app (org dashboards, member management, billing). Hosts member sign-in plus business-onboarding sign-up (creates owner account + org + membership).
- **`@876/console`** — the internal 876 admin console used to manage and support the whole platform (users, orgs, roles/permissions, settings). Privileged; invite-only embedded sign-in.
- **`@876/api`** — the FastAPI core that owns all DB/provider access and business logic, including the OAuth Authorization Server (`/oauth`, dormant — reserved for future third-party "Sign in with 876").

Future apps (e.g. an "876 Eats" ordering app, an "876 Commerce" storefront platform, native/mobile clients) consume 876 for login and account data through the same client surface, adding their own API services and SDK packages. **All clients use the standardized `$876.<resource>.<verb>()` surface, tiered by API auth so admin-only operations never reach consumer apps.** See `.claude/rules/sdk-conventions.md` — read it before changing any client/data-access code.

## Package Manager

Use **pnpm** only: `pnpm install`, `pnpm dev`, `pnpm --filter <package> <script>`.

## Current Architecture

| Workspace         | Path              | Port | Role                                                                                      |
| ----------------- | ----------------- | ---- | ----------------------------------------------------------------------------------------- |
| `@876/app`        | `apps/876`        | 3000 | Consumer app — embedded auth; org/account management; PWA.                                |
| `@876/enterprise` | `apps/enterprise` | 3001 | Enterprise org workspace — embedded auth (sign-in + business onboarding); org dashboards. |
| `@876/console`    | `apps/console`    | 3002 | Internal Console — embedded admin sign-in; platform admin console.                        |
| `@876/couriers`   | `apps/couriers`   | 3003 | Couriers SaaS app — multitenant courier management platform.                              |
| `@876/api`        | `apps/api`        | 4000 | FastAPI backend; owns database/provider server calls + OAuth Authorization Server.        |

### Shared packages

| Package      | Path             | Role                                                                                                                                                                                         |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@876/sdk`   | `packages/sdk`   | Consumer/first-party client (`$876`). App-API-key/session tier; browser + server. Auth, OAuth, and self-scoped (non-`AdminDep`) resources. No session or DB access.                          |
| `@876/admin` | `packages/admin` | Privileged platform-admin client (`$876`). Internal-key tier, server-only. All `AdminDep` CRUD/list/search across users, orgs, memberships, roles, features, apps.                           |
| `@876/core`  | `packages/core`  | Errors, ID generation, timestamps, shared utilities.                                                                                                                                         |
| `@876/ui`    | `packages/ui`    | shadcn/ui primitives (Base UI + Tailwind v4) + shared design tokens/auth CSS. Subpath imports only. Embeddable auth UI lives at `@876/ui/auth` (presentation + flow only; no session state). |

## Cloudflare Deployment

Each Next.js app deploys independently to **Cloudflare Workers** using **`@opennextjs/cloudflare`** (OpenNext). `@876/api` (FastAPI/Python) cannot run on Cloudflare — deploy it separately on Railway, Fly.io, or Render.

**Adapter:** `@opennextjs/cloudflare` v1.20+ (installed in all four Next.js apps). Do NOT use the deprecated `@cloudflare/next-on-pages`.

**Per-app Cloudflare config files** (all four apps have these):

- `wrangler.jsonc` — Cloudflare Worker name, bindings, `nodejs_compat` flag
- `open-next.config.ts` — OpenNext build config
- `.dev.vars` — local dev env vars (gitignored; create from `.env.example`)

**Per-app scripts:**

```bash
pnpm --filter @876/app preview   # local Cloudflare preview (opennextjs-cloudflare build + preview)
pnpm --filter @876/app deploy    # deploy to Cloudflare Workers
```

**Cloudflare dashboard setup** (one-time, per app):

1. Create a Workers project per app (NOT Pages)
2. Set Root Directory to the app folder (e.g. `apps/876`)
3. Build command: `pnpm --filter @876/app build` (skip `turbo run build` — it tries to build the Python API)
4. Deploy command: `opennextjs-cloudflare deploy`
5. Set environment variables matching the app's `.env.local` keys

**Prisma apps (console + couriers):** Cloudflare Workers needs **Hyperdrive** for Postgres connection pooling. Add a `hyperdrive` binding in `wrangler.jsonc` before deploying. Direct `pg` connections per invocation will fail.

**`.open-next/` is gitignored** — it's the OpenNext build output directory.

API also runs directly from `apps/api`:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload
python -m pytest
python -m mypy . tests
python -m ruff check .
```

## Rules Directory

Rule files live in `.claude/rules/` (the canonical copy Claude Code loads from) and are mirrored into:

| Mirror           | Audience                                      | Notes                                                                                                                                                                              |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/rules/` | Codex, `agy`, Gemini, other non-Claude agents | Full mirror (includes `cli.md`). Relative links use `.agents/rules/`.                                                                                                              |
| `.grok/rules/`   | Grok                                          | Same shared rules **except `cli.md`** (never present). Grok-only extras: `00-grok.md`, `agents.md`, `advisor.md` (and `.grok/skills/advisor/`). Relative links use `.grok/rules/`. |

**When you edit a shared rule, update all three trees** (or run a sync pass) — do not let them drift. Do **not** copy `cli.md` into `.grok/rules/` (Grok must never read that file). Do **not** copy `advisor.md` into `.claude/rules/` or `.agents/rules/` — advisor is Grok-only. See `.claude/rules/implementation-tracker.md` for tracking multi-file work.

`.claude/rules/performance.md` is a short index; it links out to eight category files (`performance-waterfalls.md`, `performance-bundle-size.md`, `performance-server-side.md`, `performance-client-fetching.md`, `performance-rerender.md`, `performance-rendering.md`, `performance-js.md`, `performance-advanced.md`). Open only the categories relevant to the change, not the whole set.

See `.claude/rules/cli.md` before spawning any sub-agent or driving Codex/`agy`/`opencode`/Command Code — it defines which model/tool handles which task class (exploration, implementation, design-critical, trivial/docs) and how to invoke each CLI non-interactively. (**Claude Code and non-Grok harnesses only** — Grok must not open `cli.md`.)

## Required Context

- Read `apps/docs/content/docs/index.mdx` at session start when working on documentation.
- Read `.claude/rules/performance.md` (index — open only the relevant category file(s)), `.claude/rules/types.md`, `.claude/rules/code-style.md`, and `.claude/rules/data-fetching.md` before editing app code.
- Read `.claude/rules/api-backend.md` before editing `apps/api`, API contracts, OpenAPI docs, repositories, provider integrations, or API client methods.
- Read `.claude/rules/app-layout.md` before scaffolding or editing any page in Console, Enterprise, Couriers, Billing, or a new sidebar-style app (page containers, toolbars, list status filters, list/detail/settings patterns, forms-vs-dialogs, back-links, button labels/colors). These do not apply to `@876/app` (consumer), which has its own layout.
- Read `.claude/rules/stripe-api-pattern.md` before changing API contracts, SDK contracts, service results, provider errors, or serialized resources.
- Read `.claude/rules/api-access.md` before writing any data-fetching code in `apps/876` or `apps/console`.
- Read `.claude/rules/sdk-conventions.md` before adding or changing any client/data-access method in `@876/sdk`, `@876/admin`, or app data-fetching code (covers the `$876.<resource>.<verb>()` surface, client tiers, and the auth-tier gating rule).
- Read `.claude/rules/feature-flags.md` before creating, renaming, seeding, or evaluating any feature flag (app-prefixed `<app>_<group>_<child>` key standard, parent/child group semantics, PostHog + local catalog sync).
- Read `.claude/rules/customer-architecture.md` before modeling, storing, importing, linking, or disclosing customer, customer-profile, account-linkage, or sensitive-identifier (TRN/passport) data in any app (fixed terminology + the identity/relationship/app-profile layering).
- Read `.claude/rules/git.md` before committing, branching, or opening a PR (Conventional Commits, atomic-commit granularity, no AI commit attribution, branch from `main`).
- For Next.js routing/rendering/config/metadata/proxy changes, read the matching local guide in `node_modules/next/dist/docs/` first.

## Sub-Agent Rules

- **Never run sub-agents (Codex, `agy`, `opencode`, Command Code, or any agent) in the background.** Always run them in the foreground so you can monitor output, catch errors, and verify results inline. Background sub-agents are forbidden unless explicitly authorized in writing by the user.
- **Read `.claude/rules/cli.md` before spawning any sub-agent or CLI.** It is the canonical routing rule for which model handles which task class:
  - **Code exploration/research** → a Sonnet sub-agent at high reasoning depth, briefed with the exact question, why it's needed, and the expected return shape (file:line citations, exact shapes) — this is the highest-token category, so a shallow one-line brief undermines the whole point of delegating it.
  - **Advanced/critical implementation** → an Opus sub-agent at high reasoning depth.
  - **General, routine updates** → an Opus sub-agent at medium reasoning depth.
  - **Design decisions and the highest-stakes/security-sensitive code** → **Fable, executed directly by the primary agent, never delegated to a sub-agent** at medium/high effort. A low-effort Fable sub-agent is the only exception, and only after asking the user first.
  - **Docs-only work** → `agy` (Sonnet 4.6 Thinking, existing convention) or `opencode`/Command Code with DeepSeek V4.
  - **Trivial/mechanical/mass-simple changes** (e.g. a renamed function and all its call sites) → orchestrate `opencode` or Command Code with DeepSeek V4, run in parallel across non-overlapping file sets.
  - See `.claude/rules/cli.md` for the exact non-interactive invocation of each CLI.
  - For the exact Codex/agy invocation commands, briefing format, and split ratio, see the `sub-agent-delegation` skill.

## Boundaries

- **Core identity & shared-platform data, provider calls, and platform business logic belong in `apps/api` (FastAPI).** Next.js apps must not contain raw `fetch` calls to FastAPI or any direct access to identity/platform data or providers.
- **App-local operational data may use the app's own datastore.** An app that owns a bounded context (e.g. Console's admin-internal state) may run its own database — Console uses an in-app Prisma 7 datastore (`apps/console/prisma/`) — provided it (1) never stores or duplicates identity/platform tables, (2) references core 876 entities by **opaque ID only** (no cross-DB foreign keys), resolving identity details through `$876`, and (3) stays server-only. This is a deliberate, scoped exception to the rule above; see `.claude/rules/platform-services.md`.
- `@876/app` and `@876/console` fetch data exclusively through `@876/sdk` (consumer/auth) or `@876/admin` (Console server components).
- **No server actions.** Client-initiated mutations go through a thin pure-transport route handler (`app/api/...`) that authorizes and calls `$876`, invoked via the app's typed browser client (`client` from `@/lib/client`). Route handlers contain no business logic. See `.claude/rules/api-access.md` and `.claude/rules/sdk-conventions.md`.
- `@876/admin` server-side calls authenticate with a **secret service key** (`API_876_SERVICE_KEY`; legacy alias `API_INTERNAL_KEY`). It is the `sk_`-tier credential for privileged platform mutations and must never reach the browser — the Console route handlers exist precisely to keep it server-side. An exposable/publishable key must never carry admin scope. See `.claude/rules/platform-services.md` for the key tiers and hardening.
- `@876/sdk` is request-only auth/OAuth transport; apps own cookies, session stores, and navigation.
- `@876/ui/auth` (the auth UI subpath of `@876/ui`) is presentation and flow logic only; do not add session state there.
- Console-only logic stays under `apps/console/src/lib/` and must not be imported by consumer/org code.
- App-owned timestamps are Unix seconds in DB/API/SDK/client contracts.
- Do not commit real secrets from `.env*` files.

## Routing — proxy.ts (not middleware.ts)

Both Next.js apps use `src/proxy.ts` (exported as `middleware`) instead of `middleware.ts`. The proxy runs on the Edge runtime and only has access to the sealed session cookie snapshot (`userId`, `accountType`). It performs coarse routing only:

- `@876/app`: redirects enterprise users off `/app/*` and consumer users off `/org/*`.
- `@876/console`: validates session exists; all permission checks happen in RSC layouts.

Fine-grained permission and feature checks belong in **RSC layouts and server components**, not in the proxy.

## Authentication Architecture

Session cookies are sealed with `iron-session` (`unsealSession876`). The session snapshot contains `userId` (WorkOS user ID) and `accountType`. Full user data (role, permissions, features) is fetched from the API in server components using the internal key.

Permission helpers live in each app's `src/lib/auth/guards.ts`:

- `@876/app`: `requireSession`, `requireConsumerAccount`, `requireEnterpriseMembership`, `requireConsumerFeature`, `hasPermission`
- `@876/console`: `requireConsoleAccount`, `requireConsolePermission`, `hasPermission`

Platform permissions are derived from `users.role` via `apps/api/core/permissions.py`. The API returns a `permissions: string[]` field on every user response.

## API Architecture (FastAPI)

Entry: `main.py` → `api/v1.py`. Domain routers live in `domains/<name>/router.py`; route-level OpenAPI docs live in matching `docs.py`; Pydantic contracts live in matching `schemas.py`.

| Domain        | Path prefix      | Auth                                                                    |
| ------------- | ---------------- | ----------------------------------------------------------------------- |
| auth          | `/auth`          | Public / session                                                        |
| oauth         | `/oauth`         | Public / bearer                                                         |
| users         | `/users`         | AdminDep (internal key) except `/oauth-grants`, `/ensure` (app API key) |
| organizations | `/organizations` | AdminDep                                                                |
| memberships   | `/memberships`   | AdminDep                                                                |
| features      | `/features`      | AdminDep                                                                |
| apps          | `/apps`          | ApiKeyDep + AdminDep where required                                     |
| health        | `/health`        | Public                                                                  |

`require_api_key` protects the top-level protected router and validates `876_app_secret_*` API keys. `AdminDep` requires the `x-internal-key` header to match `API_INTERNAL_KEY`; when `API_INTERNAL_KEY` is empty, admin routes reject all requests. DB models live in `db/models.py`; repositories in `db/repositories/`. See `.claude/rules/api-backend.md` for backend route, schema, docs, auth, and testing rules.

## Data Fetching Pattern

Each app initializes its client once and exports it as `$876` (Prisma-style singleton), then calls `$876.<resource>.<verb>()` directly. Do not add bespoke flat wrappers (`listUsers()`, etc.).

Console's admin client lives at `apps/console/src/lib/876.ts`:

```ts
import 'server-only'
import { create876AdminClient } from '@876/admin'

export const $876 = create876AdminClient({
  internalKey: process.env.API_INTERNAL_KEY,
  apiKey: process.env.API_876_KEY,
})
```

```ts
// In a server component:
import { $876 } from '@/lib/876'
const { data } = await $876.orgs.list({ limit: 25 })
```

The consumer app uses an API-key-tier `$876` at `apps/876/src/lib/876.ts` for self-scoped server calls (developer apps, connected apps). Privileged session bootstrap stays on the internal-key admin client in `apps/876/src/lib/auth/guards.ts` only.

Adding a new API operation (see `.claude/rules/sdk-conventions.md` for the full recipe):

1. Add the endpoint to `apps/api` (FastAPI router + repository method) with its auth dependency.
2. Add the typed method to the correct tier: `@876/admin` (`packages/admin/src/client.ts`) if `AdminDep`, and/or `@876/sdk` (`packages/sdk/src/client.ts`) if API-key/session and self-scoped.
3. Call through the package's `$876` in the Next.js app — never fetch directly.

## API Contracts

- Every serialized resource includes a Stripe-style `object` discriminator (`"object": "user"`).
- SDK/API results use `{ data, error }` envelopes.
- Timestamps are Unix seconds.
- List responses: `{ object: "list", data: T[], has_more: bool, url: string, total_count: int | null }`.
- Cursor pagination via `starting_after` / `ending_before` (item ID-based).
- Client-safe errors must not include HTTP status fields.

## Codespace / Environment Notes

In GitHub Codespaces, `NEXT_PUBLIC_API_URL` must be the HTTPS-forwarded Codespace URL for port 4000 (e.g. `https://<codespace>-4000.app.github.dev`), set in `apps/console/.env.local`. The server-side `API_URL` stays `http://127.0.0.1:4000`. Port 4000 must be set to **Public** in the Codespaces Ports panel.

## UI Copy

**No wordy subheading/description paragraphs under section headers.** Do not add an explanatory `<p>` under a page or section `<h2>`/`<h1>` restating what the table/list below it already shows (e.g. "The subscribable plan catalog for X. Orgs provisioned onto this app default to..."). A bare heading is enough — the UI is not a place for prose. This also applies to `Empty`/`EmptyDescription` states: keep them to a short title, skip the descriptive sentence unless it conveys a non-obvious next step. Inline form-field hints (one short line under an input) are fine; restating the obvious is not.

## UI Design

**No green buttons.** Never style an interactive button (primary, `brand`, or any custom variant) green. Green is reserved for status indicators only (badges like "active"/"enabled"). If a button needs a strong accent, use the existing `brand`/`info` button variants — do not introduce a green button variant or inline green classes on a `<Button>`.

## Commit Attribution

Per memory: do **not** add Claude/AI co-author attribution to commits.

## Docs

- SDK documentation lives under `apps/docs/content/docs/` and is rendered by `@876/docs`.
- API method references in the docs app use `apps/docs/openapi.json`; regenerate it with `pnpm sync:openapi` when API contracts change.
- Package-local notes stay in package `README.md` files.

## Research & Best Practices

Before recommending an approach for user-facing patterns (auth flows, RBAC, provisioning, UX conventions, API design), **run a web search** to supplement built-in knowledge — especially when the question involves industry norms, modern library choices, or security practices. Use the current year as the search reference.

- Search to confirm your understanding; don't treat first-page results as authoritative — synthesize with judgment.
- Prefer narrow queries: `"SaaS workspace provisioning RBAC 2025"` beats `"best practices"`.
- If results are thin or generic, say so and note that your recommendation leans on built-in knowledge.
- For code-mechanics questions (how to call a specific API, what a flag does), built-in knowledge is usually sufficient — don't search unless there's a known recency risk (e.g. a package that releases often).

## Antigravity Rules

- Always create and maintain the implementation plan (`implementation_plan.md`) in the root project directory.
- For the `agy` delegation model, exact invocation, and briefing format, see the `sub-agent-delegation` skill.
- Scope parallel `agy`/Codex tasks to non-overlapping files.
