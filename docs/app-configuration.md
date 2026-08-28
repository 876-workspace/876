# 876 App Configuration, Secrets & Troubleshooting

Read this before creating a new 876 app, before setting or changing any
production secret, and **first** whenever an app "authenticates but bounces back
to the login page".

This document exists because 876 Invoice shipped on 2026-08-15 and nobody could
sign into it in production for a full day. Nothing was wrong with its code. One
secret value on one Worker was wrong, and the platform is built so that this
particular mistake produces **no error anywhere** — see
[The silent failure](#the-silent-failure-read-this-first).

Companion documents:

| Document                              | Owns                                                     |
| ------------------------------------- | -------------------------------------------------------- |
| `.claude/rules/new-app-guide.md`      | The step-by-step checklist for creating an app           |
| `docs/cloudflare.md`                  | Deployment mechanics, Workers/Containers, build settings |
| `.claude/rules/sdk-conventions.md`    | The `$876.<resource>.<verb>()` client surface and tiers  |
| `.claude/rules/platform-services.md`  | Which bounded context owns which data, and the key tiers |
| `.claude/rules/product-org-signup.md` | Org sign-up and onboarding for org-workspace apps        |

---

## 1. The ecosystem in one page

876 is **one identity that unlocks many product apps.** A single 876 account —
consumer or enterprise — signs a user into every 876 surface.

```
                        ┌──────────────────────────────┐
                        │  876-api  (Express, Container)│
                        │  identity · orgs · auth · OAuth│
                        │  SEALS the 876-session cookie │
                        └───────────┬──────────────────┘
                                    │  every app calls it
        ┌───────────────┬───────────┼───────────┬───────────────┐
        │               │           │           │               │
   876-app        876-enterprise  876-console  876-couriers   876-invoice
   (consumer)     (org workspace) (internal)   (courier SaaS) (invoicing)
        │               │           │           │               │
        └───────────────┴───────────┴─────┬─────┴───────────────┘
                                          │  product data planes
                        ┌─────────────────┼──────────────────┐
                  876-billing-api    876-storage-api    876-widgets-api
                  (money, customers)  (files, R2)        (widgets)
```

Three kinds of workspace, and the difference decides where data lives:

| Kind                 | Examples                                                             | Owns a datastore?                    |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| **Identity core**    | `876-api`                                                            | Yes — users, orgs, memberships, auth |
| **Product app (UI)** | `876-app`, `enterprise`, `console`, `couriers`, `invoice`, `billing` | Only if it owns a bounded context    |
| **Product service**  | `billing-api`, `storage-api`, `widgets-api`, `couriers-api`          | Yes — its own bounded context        |

Invoice owns **no** database: its records live in the Billing data plane. That
is why its Worker has no database secret, and it is a deliberate design choice,
not an omission.

### How the apps talk to each other

There are exactly three channels. Anything else is a bug.

**1. Browser → its own app's route handlers.** The browser never calls
`876-api` directly and never holds an API key. It calls same-origin
`/api/auth/*` (auth bridge) or `/api/<resource>` (thin transport route
handlers). See `.claude/rules/api-access.md`.

**2. App server → `876-api`, through `$876`.** Server components and route
handlers call the typed client (`@876/sdk` for session/app-key tier,
`@876/admin` for the internal-key admin tier). Never a raw `fetch`. See
`.claude/rules/sdk-conventions.md`.

**3. App server → a product service** (`billing-api`, `storage-api`, …) through
that service's client package, with that service's own key.

```
   Browser                    App Worker                     876-api
   ───────                    ──────────                     ───────
   fetch('/api/auth/login') ─► /api/auth/[...path]
                               + X-876-API-Key   ──────────► POST /auth/login
                               + X-876-Realm                       │
                               + x-876-origin                      │ seals cookie
                               ◄──── Set-Cookie: 876-session ──────┘
   stores cookie   ◄──────────  relayed verbatim
   (app's origin)

   GET /  ──────────────────► RSC layout
                               verifySession876(cookie)  ← LOCAL HMAC CHECK,
                                                            no network call
```

**The last line is the whole point of this document.** Session verification is a
local HMAC check inside each app. There is no call to the API, so there is
nothing to fail loudly — if the app's secret differs from the API's, the app
just decides the visitor is signed out.

### Client-side vs server-side, and what may cross

| Runs where          | May hold                                           | Must never hold         |
| ------------------- | -------------------------------------------------- | ----------------------- |
| Browser (client)    | `NEXT_PUBLIC_*` values only                        | any API key, any secret |
| App Worker (server) | app API key, internal key, session secret, DB URLs | —                       |
| `876-api` container | provider credentials, database, cookie secret      | —                       |

`NEXT_PUBLIC_*` values are **inlined into the JavaScript bundle at build time**.
They are public. That is why Workers Builds needs them as _build_ variables,
while everything else is a _runtime_ secret. Putting a secret behind a
`NEXT_PUBLIC_` name publishes it to every visitor.

---

## 2. The silent failure — read this first

`876-api` seals the `876-session` cookie:

```
cookie = base64url( <JSON payload> "." <hex HMAC-SHA256(payload, SECRET)> )
```

Every app verifies that HMAC locally with **the same secret**
(`verifySession876` in `@876/core/auth/session-cookie`, re-exported by each
app's `src/lib/auth/session-cookie.ts`).

If the two sides hold different values:

1. The user signs in. The API authenticates them **successfully** — it returns
   `200` and a valid `Set-Cookie`.
2. The browser stores the cookie on the app's origin. It is present and correct.
3. The app reads the cookie, the HMAC check fails, `verifySession876` returns
   `null`, and the guard treats the request as **signed out**.
4. The guard redirects to `/login`.
5. **Nothing is logged. No error is raised. No Sentry event fires.** Server logs
   show `200` on the login and `307` on the next page. It looks exactly like a
   broken identity provider or a cookie problem.

There is no rate limit, no error banner and no clue. The only symptom is an
infinite bounce back to the login page — for password sign-in and social
sign-in alike, because both end at the same cookie.

**The secret resolution order is identical on both sides** (`@876/core` and
`apps/api/src/config/index.ts`):

```
SESSION_COOKIE_SECRET  →  WORKOS_COOKIE_PASSWORD  →  dev default (non-production only)
```

Two consequences that have both bitten this platform:

- A Worker with `SESSION_COOKIE_SECRET` set to one value and
  `WORKOS_COOKIE_PASSWORD` set to another silently uses the **first**. Setting
  the "other" name does nothing.
- In production a missing secret resolves to `null` and the app **fails closed**
  — every visitor is signed out, forever, silently.

> **Standard:** every Worker that seals or verifies the cookie stores the value
> under `SESSION_COOKIE_SECRET`, and that value is identical everywhere. It is
> synced from the `SESSION_COOKIE_SECRET` repository secret by
> `.github/actions/sync-session-secret` on every deploy. Do not set it by hand.

---

## 3. Environment variables and secrets

### 3.1 The three kinds of value

| Kind               | Set where                               | Visible to browser | Example                                     |
| ------------------ | --------------------------------------- | ------------------ | ------------------------------------------- |
| **Build variable** | Workers Builds → Settings → Build       | **Yes**            | `NEXT_PUBLIC_API_URL`                       |
| **Runtime var**    | `wrangler.jsonc` → `vars`               | No                 | `API_URL`, `BILLING_API_URL`, `CRM_API_URL` |
| **Runtime secret** | `wrangler secret put` / deploy workflow | No                 | `SESSION_COOKIE_SECRET`                     |

A `NEXT_PUBLIC_*` value set only as a runtime var is **not** available to the
browser bundle — it is inlined at build time, and Workers Builds does not
inherit runtime secrets. This is the second most common new-app misconfiguration
after the session secret.

### 3.2 Shared values — must be byte-identical across services

| Value                   | Held by                                        | Symptom when it drifts                            |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `SESSION_COOKIE_SECRET` | `876-api` + **every** app                      | Sign-in bounces to `/login`, silently. §2.        |
| `API_INTERNAL_KEY`      | `876-api` + every app making admin-tier calls  | Admin reads 401; apps show "Setup is unavailable" |
| `BILLING_INTERNAL_KEY`  | `876-api`, `console`, `billing`, `billing-api` | Billing admin calls fail                          |
| `WIDGETS_SERVICE_KEY`   | `widgets-api` + every host that calls it       | Widgets fail to load                              |
| `STORAGE_INTERNAL_KEY`  | `storage-api` + every uploader                 | Uploads rejected                                  |
| `CRM_INTERNAL_KEY`      | `crm-api`, `crm`, `console`                    | CRM reads 401; Console shows an empty workspace   |

Rotating any of these means setting it on **every** holder. Miss one and that
service breaks in the way described above — usually silently.

### 3.3 Per-app secret inventory

The machine-readable source of truth is
`scripts/cloudflare-release-contract.mjs`; `pnpm check:worker-secrets` enforces
it. Adding an app-level `wrangler.jsonc` without an entry there is a CI failure,
so a new app cannot skip the preflight.

| Worker           | Required runtime secrets                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `876-api`        | `API_INTERNAL_KEY`, `BILLING_INTERNAL_KEY`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, `OAUTH_KEY_ID`, `POSTHOG_*`, `SENTRY_DSN`, `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `SESSION_COOKIE_SECRET` |
| `876-app`        | `SESSION_COOKIE_SECRET`                                                                                                                                                                      |
| `876-enterprise` | `API_876_KEY`, `API_INTERNAL_KEY`, `SESSION_COOKIE_SECRET`                                                                                                                                   |
| `876-console`    | `API_876_KEY`, `API_INTERNAL_KEY`, `BILLING_INTERNAL_KEY`, `CRM_INTERNAL_KEY`, `CONSOLE_DATABASE_URL`, `WIDGETS_SERVICE_KEY`, `SESSION_COOKIE_SECRET`                                        |
| `876-couriers`   | `API_876_KEY`, `API_INTERNAL_KEY`, `DATABASE_URL`, `STORAGE_INTERNAL_KEY`, `WIDGETS_SERVICE_KEY`, `SESSION_COOKIE_SECRET`                                                                    |
| `876-billing`    | `API_INTERNAL_KEY`, `BILLING_API_876_KEY`, `BILLING_INTERNAL_KEY`, `WIDGETS_SERVICE_KEY`, `SESSION_COOKIE_SECRET`                                                                            |
| `876-invoice`    | `API_INTERNAL_KEY`, `INVOICE_API_876_KEY`, `SESSION_COOKIE_SECRET`                                                                                                                           |
| `876-crm`        | `API_INTERNAL_KEY`, `CRM_API_876_KEY`, `CRM_INTERNAL_KEY`, `SESSION_COOKIE_SECRET`                                                                                                           |
| `876-crm-api`    | `BILLING_INTERNAL_KEY`, `CRM_API_876_KEY`, `CRM_DATABASE_URL`, `CRM_INTERNAL_KEY`                                                                                                            |

Note that the app API key is named **per app** (`API_876_KEY`,
`BILLING_API_876_KEY`, `INVOICE_API_876_KEY`). Copying a bridge route from
another app without changing that name leaves `API_KEY` undefined, the bridge
sends no `X-876-API-Key`, and the API answers `api-key/missing`.

### 3.4 Local development

Every app reads its own gitignored `apps/<app>/.env`. `pnpm dev*` runs
`pnpm check:session-secret` first, which compares the session secret across
**every** app that seals or verifies the cookie — discovered from the tree, so a
new app is covered the moment it exists. A mismatch fails the command with a
message naming the outlier.

That check covers local `.env` files only. Production drift is prevented by the
deploy-time sync (§2) and detected by the probe in §5.

---

## 4. Creating a new app

`.claude/rules/new-app-guide.md` is the checklist. The configuration steps that
must not be skipped, in order:

1. **Register the app** in the platform app seeds so it exists as an `app_…`
   record, then create its API key in Console → Apps → API Keys.
2. **Pick a port** that is not taken (currently: 3000 `876`, 3001 `enterprise`,
   3002 `console`, 3003 `couriers`, 3004 `billing`, 3006 `invoice`).
3. **Add `apps/<app>/wrangler.jsonc`** with the Worker name, `nodejs_compat`,
   the `vars` block, and a `secrets.required` list.
4. **Add an entry to `scripts/cloudflare-release-contract.mjs`.** CI fails
   without it. Include `SESSION_COOKIE_SECRET` if the app verifies sessions —
   i.e. if it has `src/lib/auth/session-cookie.ts`.
5. **Add the app to `.github/workflows/deploy-cloudflare.yml`**, including the
   `Sync the shared session cookie secret` step. Copy an existing app's job.
6. **Copy the auth bridge** (`src/app/api/auth/[...path]/route.ts`) and the
   **social callback** (`src/app/callback/route.ts`) from the closest existing
   app, then change:
   - the API key env name to this app's key;
   - `X-876-Realm` — `enterprise` for an org workspace, `consumer` for a
     consumer surface. **The bridge and the callback must use the same realm**,
     or password sign-in works and social sign-in bounces.
7. **Register `https://<app-origin>/callback` in the WorkOS dashboard**, and add
   that origin to the API's `CORS_ALLOWED_ORIGINS` — the API derives the social
   `redirect_uri` from the calling app's origin only when the origin is
   allow-listed, otherwise it falls back to the configured default and the user
   lands on a different app.
8. **Set the runtime secrets**, then verify:
   `pnpm check:worker-secrets 876-<app>`.
9. **Set the build variables** (`NEXT_PUBLIC_*`) in Workers Builds. Build
   command is `pnpm run cf:build`, never `pnpm run build`.
10. **Verify sign-in works in production before calling the app done**, with the
    probe in §5.3. A green deploy proves nothing about whether anyone can log
    in.

### Org-workspace apps

If the app gates on an organization, it must also provide the org sign-up path —
a signed-in account with no organization must reach onboarding, never
`/no-access`. See `.claude/rules/product-org-signup.md`.

---

## 5. Troubleshooting

### 5.1 Symptom index

| Symptom                                                    | Most likely cause                                        | Go to                   |
| ---------------------------------------------------------- | -------------------------------------------------------- | ----------------------- |
| Sign-in succeeds, then bounces to `/login`, no error shown | Session secret mismatch between this app and `876-api`   | §5.3                    |
| Password sign-in works, social sign-in bounces             | Bridge and callback disagree on `X-876-Realm`            | §5.4                    |
| Social sign-in lands on a **different** app                | App origin missing from the API's `CORS_ALLOWED_ORIGINS` | §5.4                    |
| `api-key/missing`                                          | Bridge reads the wrong per-app key env name              | §3.3                    |
| "Setup is unavailable", or admin reads 401                 | `API_INTERNAL_KEY` missing or mismatched                 | §3.2                    |
| Signed-in user sent to `/no-access`                        | Entitlement/subscription, not authentication             | `product-org-signup.md` |
| Everything 500s but `/health` is fine                      | Container started with an empty environment              | `docs/cloudflare.md`    |

### 5.2 First, localise the failure

Work outward from the request. Cloudflare Workers Logs (observability is enabled
on every Worker) will answer the first three questions:

```bash
# Timeline of requests for one Worker, last hour.
ACCOUNT=$CLOUDFLARE_ACCOUNT_ID
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/workers/observability/telemetry/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"queryId":"q","timeframe":{"from":'$(( ($(date +%s) - 3600) * 1000 ))',"to":'$(date +%s000)'},
       "parameters":{"datasets":["cloudflare-workers"],
       "filters":[{"key":"$metadata.service","operation":"eq","value":"876-invoice","type":"string"}]},
       "limit":100,"view":"events","dry":false}'
```

Read the sequence. The signature of a session-secret mismatch is unmistakable:

```
GET /callback?code=…      307     ← the exchange succeeded
GET /                     307     ← …and the very next request is signed out
GET /login?returnTo=%2F   200
```

Then confirm the API side succeeded (`POST /auth/callback` → `200` on
`876-api`). **API 200 followed by an app bounce means the cookie is fine and the
app cannot read it.** That is the mismatch, and nothing else looks like it.

### 5.3 Prove a session-secret mismatch — the probe

This is decisive, takes ten seconds, needs no user credentials, and mutates
nothing. Seal a cookie with a candidate secret and see which apps accept the
signature.

```bash
SECRET='<candidate secret>'
COOKIE=$(node -e '
  const {createHmac}=require("node:crypto");
  const payload=JSON.stringify({
    userId:"user_diagnostic_probe_000", email:"probe@example.invalid",
    firstName:null,lastName:null,emailVerified:true,avatar:null,username:null,
    realm:"enterprise", accessToken:null, exp:Math.floor(Date.now()/1000)+600});
  const sig=createHmac("sha256",process.argv[1]).update(payload,"utf8").digest("hex");
  process.stdout.write(Buffer.from(payload+"."+sig,"utf8").toString("base64url"));
' "$SECRET")

# An app that ACCEPTS the signature redirects somewhere other than /login
# (/onboarding, /get-started, /access-denied — the probe user does not exist).
# An app that REJECTS it redirects to /login.
for host in 876-invoice 876-billing 876-console 876-enterprise; do
  printf '%-16s ' "$host"
  curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' \
    "https://$host.1876.workers.dev/" -H "cookie: 876-session=$COOKIE"
done

# And whether the API itself agrees — via any app's auth bridge, which supplies
# the API key. `auth/invalid-session` = signature rejected (the API holds a
# different secret). A `data` payload = the API accepts it.
curl -s https://876-invoice.1876.workers.dev/api/auth/session \
  -H "cookie: 876-session=$COOKIE"
```

Read the result as a set: **every app must give the same answer as the API.** An
app that disagrees with the API is the broken one. If the _API_ rejects a secret
that the apps accept, the API is the outlier.

Two cautions:

- `876-couriers` calls the identity API to confirm the account still exists
  (`requireValidSession`), so it sends the probe user to `/login` even when the
  signature is good. Use it as a control only, not as the signal.
- The probe cookie's `exp` is ten minutes. An expired probe is
  indistinguishable from a rejected one — regenerate it if in doubt.

**If a candidate secret is accepted by production, that secret is live — treat
it as a credential.** During the 2026-08-16 incident the value that production
Invoice accepted was the repository's shared _development_ secret, present in
every checkout: anyone holding it could mint a valid session for any user id.
The bug and the vulnerability were the same misconfiguration.

### 5.4 Social sign-in specifically

Social sign-in touches two extra pieces the password flow does not.

**Check where WorkOS is told to send the browser back.** The API derives the
`redirect_uri` from the `x-876-origin` header the app's bridge sends, but only
honours it when that origin is in the API's `CORS_ALLOWED_ORIGINS`; otherwise it
silently falls back to the configured default:

```bash
curl -s -X POST https://876-invoice.1876.workers.dev/api/auth/social-login \
  -H 'content-type: application/json' -d '{"provider":"google"}'
# redirect_uri MUST be this app's own /callback.
```

**Check the realm.** The API defaults an absent `X-876-Realm` to `consumer`. If
`/api/auth/[...path]` signs in as `enterprise` but `/callback` omits the header,
password sign-in works and social sign-in completes in the wrong realm. Both
files must set the same realm.

### 5.5 The API runs in a container — secrets need a restart

`876-api`, `billing-api`, `couriers-api` and `storage-api` are Cloudflare
**Containers**. The Worker copies its vars and secrets into the container
environment **when the container instance starts** (`apps/api/worker/index.ts`).

So `wrangler secret put` alone does **not** change a running API. Until the
container is replaced it keeps sealing with the old value, which looks exactly
like the mismatch you were trying to fix. Redeploy, and wait for the rollout:

```bash
gh workflow run deploy-cloudflare.yml -f app=api   # rebuilds and restarts
npx wrangler containers list                       # api-876 must reach ready/active
```

`sleepAfter` is 15 minutes, so an idle container also picks the value up on its
own eventually — do not rely on that.

### 5.6 Rotating the session secret

Signs every user out of every app, once. Order matters: update the verifiers
first, the sealer last, so that the moment the API seals with the new value
every app already accepts it.

```bash
openssl rand -hex 32 > secret.txt

# 1. Every app that verifies.
for w in 876-invoice 876-billing 876-enterprise 876-console 876-couriers 876-app; do
  cat secret.txt | npx wrangler secret put SESSION_COOKIE_SECRET --name "$w"
done

# 2. The sealer, last — then redeploy so the container restarts (§5.5).
cat secret.txt | npx wrangler secret put SESSION_COOKIE_SECRET --name 876-api
gh workflow run deploy-cloudflare.yml -f app=api

# 3. The source of truth CI syncs from, so no Worker drifts again.
gh secret set SESSION_COOKIE_SECRET < secret.txt

# 4. Verify with the probe in §5.3, then delete secret.txt.
```

Set the value with `printf '%s'` or a file — **never `echo`**, which appends a
newline and produces a secret that differs by one invisible byte.

---

## 6. Incident record — 876 Invoice login loop (2026-08-15 → 2026-08-16)

**Symptom.** No one could sign into `876-invoice.1876.workers.dev` in
production, from the day the app shipped. Google sign-in returned to the login
page. No error was displayed or logged. Several fixes were merged and deployed
against unrelated theories (callback realm, entitlement routing, redirect
origin) and none changed the outcome.

**Cause.** The `876-invoice` Worker's `SESSION_COOKIE_SECRET` held the
repository's shared **development** secret, while `876-api` sealed cookies with
the production one. Every sign-in succeeded at the API and was then discarded by
Invoice's local HMAC check. The Worker had been created by hand, so it never
received the platform value.

**Why it took a day.** Every visible signal pointed elsewhere: the API returned
`200`, the cookie was set on the right origin, the code was byte-for-byte
equivalent to Couriers (which worked), and the failure produced no log line
anywhere. The existing `check:session-secret` guard described this exact failure
in its own header comment — but its app list was hard-coded and `invoice` had
never been added to it, and it only ever inspected local `.env` files.

**Fixes applied.**

- The secret was rotated across all seven Workers and the API redeployed.
- `scripts/check-session-secret.mjs` now discovers apps from the tree, so no app
  can be omitted from the comparison again.
- `scripts/cloudflare-release-contract.mjs` requires `SESSION_COOKIE_SECRET` on
  every session-verifying Worker under one standard name — `876-app` previously
  required no secrets at all, and three Workers used the legacy
  `WORKOS_COOKIE_PASSWORD` name.
- `.github/actions/sync-session-secret` pushes the value from a single
  repository secret on every deploy, so a hand-set Worker is corrected rather
  than trusted.
- This document.

**Lesson.** A deploy that goes green proves the app builds, not that anyone can
sign in. For any app with authentication, signing in **in production** is part
of shipping it.
