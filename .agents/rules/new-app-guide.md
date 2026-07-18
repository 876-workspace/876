# New 876 App Guide

This guide covers how to create a new 876-powered app. It is framework-agnostic — Next.js specifics are called out explicitly. Skim the sections that apply to your stack.

## 1. Platform Registration

Every 876 app must be registered in the identity API so it appears in enrollment tracking, Console's app list, and can issue API keys.

Add an entry to `_seed_platform_apps` in `apps/api/main.py`:

```python
platform_apps = [
    ...
    ("My App", "876-myapp", "internal", "https://myapp.876.app"),
]
```

- **Name**: display name shown in Console
- **Slug**: must be globally unique; use `876-<appname>` for first-party apps
- **app_kind**: always `"internal"` for 876-owned apps
- **homepage_url**: canonical URL for the app

The seed runs automatically on API startup (`checkfirst=True`). After deployment, the app row is created; create an API key for it through Console > Apps > [your app] > API Keys.

---

## 2. Port Assignment

| App                 | Port |
| ------------------- | ---- |
| @876/app (consumer) | 3000 |
| @876/enterprise     | 3001 |
| @876/console        | 3002 |
| @876/couriers       | 3003 |
| _next app_          | 3004 |

Increment by 1. Set the port in `package.json` scripts and `next.config.ts`'s `allowedOrigins`.

---

## 3. Auth Integration

### 3a. The Auth Bridge Route (Next.js)

Every Next.js app hosts its own auth bridge that proxies auth requests to FastAPI:

```
src/app/api/auth/[...path]/route.ts
```

This route:

1. Receives `POST /api/auth/login`, `POST /api/auth/logout`, etc. from the frontend
2. Adds the app's API key and realm header
3. Forwards to FastAPI at `NEXT_PUBLIC_API_URL` (or `API_URL` server-side)
4. Returns the response (including the `Set-Cookie` header from FastAPI)

**Realm header** determines which user population is accepted:

- `X-876-Realm: consumer` — consumer accounts (default, used by @876/app)
- `X-876-Realm: enterprise` — org users (used by @876/enterprise and @876/couriers)

Copy the bridge route from `apps/enterprise/src/app/api/auth/[...path]/route.ts` and set the correct realm.

### 3b. Edge Proxy (Next.js)

`src/proxy.ts` (exported as `middleware`) runs on the Edge runtime for coarse routing. It reads the sealed session cookie to check whether a session exists (and optionally which realm). It does **not** have access to full user data — fine-grained checks happen in RSC layouts.

Copy from the nearest equivalent app (enterprise for org-facing apps, 876 for consumer apps). Update the redirect targets and realm checks.

### 3c. Session Cookie

Session cookies are sealed with `iron-session` using `unsealSession876` from `@876/core`. Import the unsealer from `@876/core` — do not implement your own.

### 3d. Auth UI

Embed login/register forms from `@876/ui/auth`. These are presentation components only — they call your app's `/api/auth/*` bridge route, never FastAPI directly.

---

## 4. SDK Initialization

### Consumer/session-tier (most apps)

```ts
// src/lib/876.ts
import { create876Client } from '@876/sdk'

export const $876 = create876Client({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
})
```

Use `$876.auth`, `$876.users`, `$876.apps`, etc. in server components.

### Admin-tier (Console only)

```ts
// src/lib/876.ts
import 'server-only'
import { create876AdminClient } from '@876/admin'

export const $876 = create876AdminClient({
  internalKey: process.env.API_INTERNAL_KEY,
  apiKey: process.env.API_876_KEY,
})
```

Admin-tier is server-only and uses the `x-internal-key` credential. Never expose `API_INTERNAL_KEY` to the browser or non-Console apps.

---

## 5. App-Local Data

If your app has its own domain data (e.g. Couriers has drivers, parcels, routes):

- Use a **separate database** — never share tables or add FKs to the 876 identity DB
- Reference core 876 entities (users, orgs) by **opaque ID string only** — no cross-DB foreign keys
- Keep DB access **server-only** (import only in server components or route handlers)
- Use Prisma (see `apps/couriers/prisma/` as a reference once populated)

**Rule of thumb**: if the table has a `user_id` or `org_id` column, it must be a plain string — never a FK pointing at the identity DB.

---

## 6. Workspace Setup

### pnpm

The workspace glob `apps/*` in `pnpm-workspace.yaml` picks up new apps automatically. Run `pnpm install` after adding a `package.json`.

### Turbo

Add a `dev:<appname>` script to the root `package.json`:

```json
"dev:couriers": "turbo run dev --filter=@876/api --filter=@876/couriers"
```

The Turborepo pipeline is already configured for `dev`, `build`, `typecheck`, and `test` tasks.

### Required files

For a Next.js app you need at minimum:

```
apps/<appname>/
  package.json       # name: "@876/<appname>", port in scripts
  next.config.ts     # security headers, transpilePackages, allowedOrigins
  tsconfig.json      # copy from apps/enterprise/tsconfig.json, update paths
  src/app/
    layout.tsx
    page.tsx
```

---

## 7. Environment Variables

| Variable                | Where            | Purpose                                                          |
| ----------------------- | ---------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | app `.env.local` | Public API base URL (Codespaces HTTPS URL for port 4000)         |
| `API_URL`               | app `.env.local` | Server-side API base URL (`http://127.0.0.1:4000`)               |
| `API_876_KEY`           | app `.env.local` | App API key (`876_app_key_...`) — from Console > Apps > API Keys |
| `SESSION_COOKIE_SECRET` | app `.env.local` | 32-char secret for `iron-session` cookie sealing                 |

### Codespaces

- Set `NEXT_PUBLIC_API_URL` to the HTTPS-forwarded Codespace URL for port 4000
- Port 4000 must be set to **Public** in the Codespaces Ports panel
- Server-side `API_URL` stays `http://127.0.0.1:4000`

---

## 8. Console Integration

### Seeing users who signed up for your app

App enrollment is tracked automatically. When a user authenticates through your app (first session), `UserAppEnrollment` is created. Console > Users shows which apps each user has accessed via the Apps column and the Apps accordion on the user detail page.

### Console managing your app's domain data

If Console needs to view or act on your app's domain data (e.g. list Couriers shipments for an org):

1. Expose a narrow internal admin HTTP surface in your app at `/api/admin/*`, protected by `x-internal-key`
2. In Console, create a `$<appname>` singleton client (server-only) that calls your admin endpoints with the shared internal key
3. Your app must **never** query the 876 identity DB directly — call `$876.<resource>` to resolve user/org details
4. This keeps each bounded context's data inside its own service

This is the same inter-service pattern Console uses for the 876 API itself.

---

## 9. Non-Next.js Apps (Vite / React / Vue / Native)

The integration points are the same; the implementation differs:

| Concern        | Next.js                               | Vite / SPA                                                  | Native                                             |
| -------------- | ------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Auth bridge    | `/api/auth/[...path]/route.ts`        | Thin server (Express, Hono) with same logic                 | Platform SDK (iOS, Android) calls FastAPI directly |
| Session cookie | iron-session + Next.js cookies        | iron-session on the thin server                             | Secure storage (Keychain, EncryptedSharedPrefs)    |
| SDK client     | `create876Client` in server component | `create876Client` in browser (add `credentials: 'include'`) | `create876Client` configured for native HTTP       |
| Routing guard  | `src/proxy.ts` middleware             | Server middleware on the thin server                        | Auth state check in nav guard                      |

The key invariant: **all auth flows and identity API calls go through your server-side bridge**, never directly from the browser to FastAPI with your API key exposed.
