# Brief: point service URL vars at Cloudflare, off the dead Railway host

## Why (production incident)

Every server-side `$876` call from every Next.js app is failing in production.
Console shows an empty `/apps` table, 404s on `/apps/876-enterprise`, and
"Missing: console_widgets" for feature flags; Couriers redirects to
`/onboarding` and renders "Setup is unavailable"; sign-out does nothing.

Root cause: all five Next.js apps hardcode `API_URL` to
`https://876-api-production-e78f.up.railway.app`. That Railway deployment has
been **deleted** — every path on that host returns Railway's
`{"status":"error","code":404,"message":"Application not found"}`.

The replacement is the Cloudflare Container Worker named `876-api`
(`apps/api/wrangler.jsonc`), whose public URL on this account is
`https://876-api.raheemforschool.workers.dev`. The account's workers.dev
subdomain is `raheemforschool.workers.dev` — confirmed by the already-live
`876-widgets-api` and `876-billing` Workers.

A second, related defect: `apps/console/src/lib/billing/index.ts` (lines 8, 19)
and `apps/couriers/src/lib/finance/client.ts` (line 11) read
`process.env.BILLING_API_URL`, but **no wrangler config defines that var**. It
must point at the `876-billing-api` Container Worker, which is a *different*
service from the existing `BILLING_URL` (that one points at `876-billing`, the
Next.js billing app). So `BILLING_API_URL` must be added, not renamed.

## Scope — edit exactly these five files, nothing else

1. `apps/console/wrangler.jsonc`
2. `apps/couriers/wrangler.jsonc`
3. `apps/enterprise/wrangler.jsonc`
4. `apps/billing/wrangler.jsonc`
5. `apps/876/wrangler.jsonc`

Do **not** touch application source, tests, docs, `railway.toml` files, or any
other app. Railway file/doc removal is a separate phase and must not be done here.

## Required changes

### 1. Repoint `API_URL` in all five files

```
"API_URL": "https://876-api-production-e78f.up.railway.app"
```
becomes
```
"API_URL": "https://876-api.raheemforschool.workers.dev"
```

### 2. Repoint `BILLING_OAUTH_ISSUER` (apps/billing only)

`apps/billing/wrangler.jsonc` line ~23 also points `BILLING_OAUTH_ISSUER` at the
same dead Railway host. Repoint it to
`https://876-api.raheemforschool.workers.dev` — the OAuth issuer is the identity
API, the same service.

### 3. Add `BILLING_API_URL` (apps/console and apps/couriers only)

Add alongside the existing `BILLING_URL` in the `vars` block:

```
"BILLING_API_URL": "https://876-billing-api.raheemforschool.workers.dev",
```

Leave the existing `BILLING_URL` entries exactly as they are — they are a
different service and are still correct.

### 4. Remove the now-false Railway comments

Several of these files carry a comment like:

```
// API_URL still points at Railway until the 876-api Container is deployed
// (Containers need Docker, so that deploy runs in CI).
```

That statement becomes false with this change. Replace those specific
Railway-referencing comment lines with a short accurate note, e.g.:

```
// Non-secret service URLs. Secrets (keys, DB URLs) are set with
// `wrangler secret put` and never appear here.
```

Keep the existing "Non-secret service URLs / secrets are set with wrangler
secret put" sentences that are already accurate — only remove or reword the
clauses that reference Railway or claim the Container is not yet deployed.
Do not remove unrelated comments (e.g. the commented-out `hyperdrive` binding
in `apps/couriers/wrangler.jsonc`, or the `max_instances` note).

## Constraints

- These are JSONC files: comments and trailing commas are valid and must be
  preserved in style. Match each file's existing indentation exactly.
- Do not reformat whole files; make surgical edits only.
- Do not change `compatibility_flags`, `services`, `assets`, `observability`,
  or any other block.
- Do not invent additional env vars beyond `BILLING_API_URL`.
- Do not commit. The orchestrating agent stages and commits.

## Verification (run these; both must pass)

```bash
# 1. No Railway reference remains in any wrangler config
grep -rn "railway" apps/*/wrangler.jsonc && echo "FAIL: railway ref remains" || echo "OK"

# 2. Every app resolves the new API host, and the JSONC still parses
pnpm exec prettier --check "apps/*/wrangler.jsonc"
```

Report the final content of each `vars` block you changed.
