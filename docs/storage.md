# 876 Storage — Cloudflare R2 setup

Operational runbook for provisioning the buckets, credentials, and CORS that
`apps/storage-api` needs. For the architecture — terminology, the `category` /
`audience` classification model, object keys, the upload flow — read
`.claude/rules/storage-architecture.md` first. This file is the "how do I stand
it up" companion, not the design.

> **Nothing here runs automatically.** Every command touches a real Cloudflare
> account and several are hard to reverse. Run them deliberately, per environment.

## Buckets

Two buckets per environment, because `audience` decides which one a file lands in:

| Bucket             | Holds                                  | Served as                          |
| ------------------ | -------------------------------------- | ---------------------------------- |
| `876-assets-<env>` | `audience: public` only — brand assets | stable CDN URL on a custom domain  |
| `876-files-<env>`  | everything else                        | short-lived signed `GET` URLs only |

`<env>` ∈ `development` | `staging` | `production`.

Two buckets rather than one prefix is deliberate: a misrouted object in a
single-bucket layout is world-readable by accident, whereas here the private
bucket has no public access configured at all. The separation is enforced by
infrastructure, not by a code path that could be wrong.

```bash
npx wrangler r2 bucket create 876-assets-development
npx wrangler r2 bucket create 876-files-development
# repeat for -staging and -production
```

## Public access for the assets bucket only

Attach a custom domain to `876-assets-<env>` so public files are served from a
stable, cacheable origin:

```bash
npx wrangler r2 bucket domain add 876-assets-production --domain assets.876.app
```

Set `R2_ASSETS_BASE_URL` to that origin (e.g. `https://assets.876.app`). The
service composes public file URLs as `${R2_ASSETS_BASE_URL}/${object_key}`.

**Never** attach a public domain or enable the `r2.dev` public URL on
`876-files-<env>`. If a private file ever needs to be shown in an `<img>`, the
answer is a signed read URL with a short TTL, never public access.

### Development may use the managed `r2.dev` URL

Development does not need a custom domain. Enable the managed URL instead:

```bash
npx wrangler r2 bucket dev-url enable 876-assets-development
```

**Do not use `r2.dev` URLs in staging or production** — they are rate-limited
and not intended for real traffic. Those environments get a custom domain.

### Currently provisioned (development)

| Bucket                   | Public access                                         | CORS     |
| ------------------------ | ----------------------------------------------------- | -------- |
| `876-assets-development` | `https://pub-eb91fec27f7c45b9922c0c409a11f5bf.r2.dev` | PUT rule |
| `876-files-development`  | disabled                                              | none     |

Staging and production buckets are **not** created yet.

## CORS on the assets bucket

The browser uploads bytes **directly to R2** with the signed `PUT`, so the bucket
must allow the app origins as cross-origin callers. Without this, uploads fail at
the preflight and the failure is easy to misread as a signing bug.

`cors-assets.json` — note this is the **R2 API schema** (a `rules` array), not
the S3-style `AllowedOrigins` array. Wrangler rejects the S3 shape outright:

```json
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "http://localhost:3003",
          "http://127.0.0.1:3003",
          "https://*.app.github.dev"
        ],
        "methods": ["PUT"],
        "headers": ["content-type", "content-length"]
      },
      "exposeHeaders": ["ETag"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

```bash
npx wrangler r2 bucket cors set 876-assets-development --file cors-assets.json --force
```

List origins explicitly — never `"*"`. `headers` must include exactly the headers
the service signs into the presigned `PUT` (`content-type`, `content-length`); a
header the browser sends that the bucket does not allow fails preflight, and one
the browser sends that was not signed fails with `SignatureDoesNotMatch`.

**Never set a CORS policy on `876-files-<env>`.** Private files are read through
signed URLs the server mints; no browser needs to `PUT` to that bucket directly.

Add each app origin as it starts uploading. Codespaces/preview origins are
per-environment and belong only in the development bucket's policy.

## Credentials

Create an **R2 API token scoped to these buckets only**, with Object Read &
Write. Do not reuse an account-wide token, and use a distinct token per
environment so a leak is contained to one.

**This step is dashboard-only** — wrangler has no command that mints R2
S3-compatible credentials. Go to **R2 → API → Manage API tokens → Create API
token**, scope it to the two buckets for the environment, and copy the access
key id and secret. The secret is shown once.

```
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<token access key id>
R2_SECRET_ACCESS_KEY=<token secret>
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ASSETS_BUCKET=876-assets-development
R2_FILES_BUCKET=876-files-development
R2_ASSETS_BASE_URL=https://assets-dev.876.app
```

These belong to **`apps/storage-api` alone**. No other app and no browser ever
receives them — every other service reaches storage through `@876/storage` with
the service key. Local values go in `apps/storage-api/.env` (gitignored);
deployed values are Worker secrets:

```bash
npx wrangler secret put R2_SECRET_ACCESS_KEY --name 876-storage-api
```

`STORAGE_INTERNAL_KEY` is the service key callers present as `x-internal-key`.
When it is empty the service rejects every authenticated request, matching core
`apps/api`'s `AdminDep` posture — an unset key fails closed, never open.

`STORAGE_SCHEDULER_KEY` is a separate credential used only by the daily
reclamation trigger. The Worker presents it as `x-scheduler-key` to
`POST /internal/storage-sweep`; it cannot authenticate any `/v1` storage
operation, and `STORAGE_INTERNAL_KEY` cannot authenticate the sweep. Configure
it as a Worker secret rather than a plain Wrangler variable:

```bash
npx wrangler secret put STORAGE_SCHEDULER_KEY --name 876-storage-api
```

## Verifying the setup

```bash
cd apps/storage-api
python -m scripts.check_storage
```

Round-trips a generated PNG through sign → `PUT` → `HEAD` → read URL → delete
against the configured dev bucket, printing each step. This proves credentials,
endpoint, and bucket routing **without any UI**.

It does **not** prove CORS — preflight only happens in a real browser. Verify
that separately by performing one upload from the running Couriers app; it is
the first checkpoint of the org-logo work for exactly this reason.

## Migrations

`apps/storage-api` uses Alembic:

```bash
pnpm --filter @876/storage-api db:migrate
```

Migrations run in **CI**, never in the Worker and never in the Cloudflare build.

> Note: `apps/billing-api`'s Cloudflare deploy job runs only `wrangler deploy`
> and has **no** migration step — its `alembic upgrade head` lives solely in
> `railway.toml`, which is dual-run only during cutover. Do not copy that job
> shape. The storage-api job must run migrations explicitly, or its schema will
> silently never advance.

## Retention and cleanup

R2 objects are reclaimed by the storage-api cleanup job, not inline at delete
time, because files are soft-deleted per `.claude/rules/deletions.md`. The job
also removes objects orphaned by expired or abandoned upload sessions — a
session that is signed but never completed leaves bytes with no `ready` file
record pointing at them.

The Cloudflare Worker invokes the internal sweep every day at **03:17 UTC**
(`17 3 * * *`). It uses a dedicated scheduler container instance and the
scheduler-only credential described above. The endpoint claims rows with
database locks that skip already-claimed work, so overlapping runs do not
double-process a file. Operators may still run the CLI manually; it remains a
dry run unless passed `--apply`.

Do not add an R2 lifecycle rule that deletes objects on an age basis: it would
delete bytes out from under live metadata rows. Object lifetime is owned by the
metadata, not the bucket.
