# New 876 App Guide

Read this before creating a new 876-powered app, and before changing how an
existing app authenticates or is configured for deployment.

This is the **checklist**. The reference behind it —
how the ecosystem fits together, every environment variable and secret, and the
troubleshooting playbook — is `docs/app-configuration.md`. Read that one when
something does not work, and especially when an app authenticates but bounces
back to `/login`.

> **The rule that costs the most when broken:** every app verifies the session
> cookie **locally**, with an HMAC over a secret it must share byte-for-byte
> with `apps/api`. When that secret is wrong the app does not error — it simply
> treats every visitor as signed out and redirects to `/login`, forever,
> silently. 876 Invoice shipped that way on 2026-08-15 and was unusable in
> production for a day. See `docs/app-configuration.md` §2 and §5.3.

---

## 1. Platform registration

Every 876 app must exist as a platform app record so it appears in enrollment
tracking and Console's app list, and so it can issue API keys.

Add the app to the platform app seeds in `apps/api` (the seed list that
`pnpm --filter @876/api seed` applies) with:

- **Name** — the display name shown in Console.
- **Slug** — globally unique; `876-<appname>` for first-party apps. The slug is
  a permanent identifier: renaming it orphans every enrollment and subscription
  row that points at it.
- **app_kind** — `internal` for 876-owned apps.
- **homepage_url** — the app's canonical origin.

Seeds are idempotent. After deploying, create the app's API key in
Console → Apps → _your app_ → API Keys.

---

## 2. Port assignment

| App                   | Workspace         | Port |
| --------------------- | ----------------- | ---- |
| `@876/app` (consumer) | `apps/876`        | 3000 |
| `@876/enterprise`     | `apps/enterprise` | 3001 |
| `@876/console`        | `apps/console`    | 3002 |
| `@876/couriers-app`   | `apps/couriers`   | 3003 |
| `@876/billing-app`    | `apps/billing`    | 3004 |
| `@876/invoice-app`    | `apps/invoice`    | 3006 |
| _next app_            |                   | 3007 |

Set the port in the workspace's `package.json` scripts.

---

## 3. Auth integration

### 3a. The auth bridge route

Each app hosts its own email-first login UI and authenticates **directly**
against the API core through its own thin bridge. There is no central auth app
to redirect to.

```
src/app/api/auth/[...path]/route.ts
```

The bridge is **pure transport**. It:

1. receives `POST /api/auth/login`, `/logout`, `/social-login`, … from the browser;
2. attaches this app's API key, its realm, and the request origin;
3. forwards to the core API;
4. returns the response, relaying the API's `Set-Cookie` verbatim so the session
   lands on **this app's** origin.

Copy it from the closest existing app, then change exactly two things:

- **The API key env name.** It is named per app — `API_876_KEY`,
  `BILLING_API_876_KEY`, `INVOICE_API_876_KEY`. Copying a bridge without
  renaming it leaves the constant `undefined`, no `X-876-API-Key` is sent, and
  the API answers `api-key/missing`.
- **`X-876-Realm`** — which user population may sign in:
  - `consumer` — personal accounts (`@876/app`, storefront surfaces).
  - `enterprise` — org members acting for their organization (`@876/enterprise`,
    Couriers management, Invoice).

  The API defaults an **absent** realm header to `consumer`.

### 3b. The social callback route

```
src/app/callback/route.ts
```

The provider returns the browser here with a `code`; this route exchanges it
with the API server-side, relays the session cookie, and redirects into the app.

**The callback must send the same `X-876-Realm` as the bridge.** When they
disagree, password sign-in works and social sign-in silently completes in the
wrong realm and bounces to `/login` — an Invoice bug fixed on 2026-08-16.

Two pieces of configuration are required outside the code, or social sign-in
lands on a _different app_:

- Register `https://<app-origin>/callback` in the WorkOS dashboard.
- Add `https://<app-origin>` to the API's `CORS_ALLOWED_ORIGINS`. The API only
  honours the calling app's origin for the `redirect_uri` when it is
  allow-listed; otherwise it falls back to the configured default.

Verify with:

```bash
curl -s -X POST https://<app-origin>/api/auth/social-login \
  -H 'content-type: application/json' -d '{"provider":"google"}'
# redirect_uri MUST be this app's own /callback
```

### 3c. No `proxy.ts`, no `middleware.ts`

**Do not add `src/proxy.ts` or `middleware.ts` to any app.** Next.js 16 runs
`proxy.ts` on the Node.js runtime and `@opennextjs/cloudflare` cannot execute
it — the Cloudflare build fails outright.

All routing, session, and permission checks live in **RSC layouts and server
components**, via the app's `src/lib/auth/guards.ts`. See `docs/cloudflare.md`
→ "Runtime constraints" and `.claude/rules/navigation-performance.md`.

### 3d. Session cookie

Re-export the shared reader — never implement HMAC verification per app:

```ts
// src/lib/auth/session-cookie.ts
export {
  verifySession876,
  resolveSessionCookieSecret,
  type Session876Account,
  type Session876Snapshot,
} from '@876/core/auth/session-cookie'
```

The presence of this file is how tooling discovers that the app verifies
sessions, so `pnpm check:session-secret` picks the app up automatically.

Prefer Couriers' `requireValidSession`, which additionally confirms the account
still exists and is active against the identity API — a sealed cookie keeps
proving "someone signed in" long after that account was deleted or disabled.

### 3e. Auth UI

Embed the login/register flow from `@876/ui/auth`. It is presentation and flow
only — no session state — and it calls this app's `/api/auth/*` bridge, never
the API directly.

---

## 4. Data access

Initialize one client per app and export it as `$876` from `src/lib/876.ts`,
then call `$876.<resource>.<verb>()` directly. Never a raw `fetch` to the API,
and never a bespoke flat wrapper.

| Tier                   | Package      | Credential                            | Runs             |
| ---------------------- | ------------ | ------------------------------------- | ---------------- |
| Consumer / first-party | `@876/sdk`   | app API key or session cookie         | server + browser |
| Platform admin         | `@876/admin` | `API_INTERNAL_KEY` (`x-internal-key`) | **server only**  |

An exposable key must never carry admin scope. Client-initiated mutations go
through a thin route handler that authorizes and then calls `$876` — **no server
actions**. See `.claude/rules/sdk-conventions.md` and
`.claude/rules/api-access.md`.

If the app owns a bounded context it may run its own datastore, referencing core
876 entities by **opaque ID only** — no cross-database foreign keys. See
`.claude/rules/platform-services.md`. An app with no bounded context of its own
must not grow `db/` or `service/`.

---

## 5. Workspace setup

The `apps/*` glob in `pnpm-workspace.yaml` picks up new apps automatically; run
`pnpm install` after adding a `package.json`.

Minimum files for a Next.js app:

```
apps/<app>/
  package.json          # name: "@876/<app>", port in scripts
  next.config.ts        # security headers, reactCompiler: true
  tsconfig.json
  wrangler.jsonc        # Worker name, nodejs_compat, vars, secrets.required
  open-next.config.ts
  .dev.vars.example
  src/app/layout.tsx
  src/app/page.tsx
```

Add a `dev:<app>` script to the root `package.json`. Include
`pnpm check:session-secret` in it, exactly as every other `dev:*` script does.

---

## 6. Deployment configuration — do not skip

These four steps are what separate "the app builds" from "the app works".

1. **`apps/<app>/wrangler.jsonc`** — Worker name, `nodejs_compat`, the non-secret
   `vars` block (service URLs), and a `secrets.required` list.

2. **`scripts/cloudflare-release-contract.mjs`** — add an entry. CI fails on an
   app-level `wrangler.jsonc` with no contract entry, so a new app cannot skip
   release preflights. List `SESSION_COOKIE_SECRET` in `requiredSecrets` if the
   app verifies sessions.

3. **`.github/workflows/deploy-cloudflare.yml`** — add a job by copying an
   existing app's, **including the `Sync the shared session cookie secret`
   step**. That step is what keeps the app's secret equal to the platform value
   instead of whatever was typed in by hand.

4. **Cloudflare Workers Builds** (one-time, per app):
   - Create a **Workers** project (not Pages), Root Directory `/apps/<app>`.
   - Build command `pnpm run cf:build` — **not** `pnpm run build`. `build` is
     `next build`, which only produces `.next/`, while `wrangler.jsonc` points
     `main` at `.open-next/worker.js`.
   - Deploy command `npx opennextjs-cloudflare deploy`.
   - Set the app's `NEXT_PUBLIC_*` **build** variables. They are inlined at
     build time and Workers Builds does not inherit runtime secrets.

---

## 7. Environment variables

| Variable                | Where           | Purpose                                                         |
| ----------------------- | --------------- | --------------------------------------------------------------- |
| `API_URL`               | `wrangler` vars | Server-side API base URL                                        |
| `NEXT_PUBLIC_API_URL`   | build variable  | Public API base URL (inlined into the bundle)                   |
| `NEXT_PUBLIC_APP_URL`   | `wrangler` vars | The consumer app origin, for "go to my 876 account" links       |
| `<APP>_API_876_KEY`     | runtime secret  | This app's API key (`876_app_secret_…`)                         |
| `API_INTERNAL_KEY`      | runtime secret  | Admin-tier calls. Server-only, never exposed                    |
| `SESSION_COOKIE_SECRET` | runtime secret  | **Shared with `apps/api` and every app.** See the warning above |

Locally, each app reads its own gitignored `apps/<app>/.env`; start from
`.dev.vars.example` / `.env.example`.

Full per-app inventory: `docs/app-configuration.md` §3 and
`scripts/cloudflare-release-contract.mjs`.

---

## 8. Console integration

App enrollment is tracked automatically: the first time a user authenticates
through the app, an enrollment record is created, and Console shows it on the
user's Apps accordion.

If Console needs to act on the app's own domain data, expose a narrow internal
admin surface at `/api/admin/*` guarded by `x-internal-key`, and give Console a
server-only client for it. The app must never query the identity database
directly — it resolves user/org details through `$876`.

---

## 9. Org-workspace apps

If the app gates access on an organization, a signed-in account with **no**
organization must reach onboarding, never `/no-access`, and an `owner`/`admin`
whose org merely lacks the entitlement must be routed to setup rather than a
wall. Sign-up and onboarding ship together, or neither ships. See
`.claude/rules/product-org-signup.md`.

---

## 10. Before you call the app done

A green deploy proves the app builds. It proves nothing about whether anyone can
sign in.

```bash
pnpm check:session-secret                 # local secrets agree across apps
pnpm check:worker-secrets 876-<app>       # production secrets are present
pnpm check:worker-readiness 876-<app>     # the deployed Worker answers
```

Then, in production:

- [ ] Sign in with a password. You land in the app, not back on `/login`.
- [ ] Sign in with Google. Same result.
- [ ] The social `redirect_uri` is this app's own `/callback` (§3b).
- [ ] A brand-new account with no organization reaches onboarding (§9).

If sign-in bounces, go straight to `docs/app-configuration.md` §5 — the probe
there identifies a session-secret mismatch in about ten seconds, without needing
anyone's credentials.

---

## 11. Non-Next.js apps

The integration points are identical; only the implementation differs.

| Concern        | Next.js                        | Vite / SPA                                   | Native                                          |
| -------------- | ------------------------------ | -------------------------------------------- | ----------------------------------------------- |
| Auth bridge    | `/api/auth/[...path]/route.ts` | Thin server (Hono/Express) with same logic   | Platform SDK against the API                    |
| Session cookie | app origin, set by the API     | same, via the thin server                    | secure storage (Keychain, EncryptedSharedPrefs) |
| Client         | `$876` in server components    | `create876Client` + `credentials: 'include'` | `create876Client` on native HTTP                |
| Route guard    | RSC layout guards              | server middleware on the thin server         | auth-state nav guard                            |

The invariant: **all auth flows and identity API calls go through a server-side
bridge.** The browser never holds an API key.
