# Brief — fix the three review findings on PR #212 (`apps/couriers-api`)

All three are legitimate. Fix them on the current branch (`feat/couriers-api`).
Do not commit, branch, or push.

**Do not touch `packages/couriers/`** — a concurrent task owns it and a conflict
there will be discarded.

## Read first

- `.claude/rules/express-api.md` — the spec, especially the auth-tier section.
- `apps/api/src/http/auth/` — how the platform service verifies bearer tokens.
- Root `package.json`, `turbo.json`, and `.github/workflows/` — how other
  packages' checks are wired into CI.
- `apps/couriers/prisma.config.ts` and `apps/api/prisma.config.ts` — how the
  existing apps handle the migrate connection URL.

## Finding 1 (P2) — bearer tokens are not verified against the platform key

`apps/couriers-api/src/platform/jwt.ts`

A route declaring `security: 'session'` would reject every real platform access
token, because verification does not check the signature against the platform's
public key. No route uses that tier **yet**, which is the only reason this is
not already broken — the tenants routes are apiKey and admin. Fix it before a
session route exists, not after.

Mirror however `apps/api` verifies a platform access token: same key source,
same issuer/audience checks, same clock tolerance. Keep the existing
`token_use === 'access'` rejection — an id token or a client-credentials token
must never stand in for a user session.

If the verification needs configuration (a JWKS URL or public key), add it to
the Zod schema in `src/config/` and to `.dev.vars.example`, and document it in
`README.md`'s environment table.

## Finding 2 (P2) — the boundary gate is not enforced anywhere

`apps/couriers-api/package.json`

`pnpm boundaries` exists but nothing runs it: the root `check`, `turbo.json`,
and the workflows all skip it. A gate nobody runs is a comment.

Wire it in the same way the repo already runs `lint`/`typecheck`/`test` for
other workspaces — read `turbo.json` and the workflows and follow whatever the
existing pattern is rather than inventing one. If `apps/api` has the same gap,
say so in your report; do **not** fix `apps/api` here.

## Finding 3 (P2) — an optional variable is required in practice

`apps/couriers-api/prisma.config.ts`

It resolves `env('DIRECT_DATABASE_URL')` unconditionally, so a developer who
follows the README, sets the required `DATABASE_URL`, and omits the documented-
as-optional `DIRECT_DATABASE_URL` cannot run `prisma generate` at all. This bit
during development tonight and needed a placeholder `.env` to work around.

Fix so the config falls back to `DATABASE_URL` when `DIRECT_DATABASE_URL` is
absent — matching what `src/config/index.ts` already does
(`directDatabaseUrl: e.DIRECT_DATABASE_URL ?? e.DATABASE_URL`). Then make sure
`prisma generate` works with only `DATABASE_URL` set, and delete
`apps/couriers-api/.env` if it is now unnecessary (it is gitignored and holds a
placeholder).

Keep the README's environment table truthful about which variables are actually
required.

## Verify

```bash
cd /workspaces/876/apps/couriers-api
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/depcruise src --config .dependency-cruiser.cjs
./node_modules/.bin/vitest run
DATABASE_URL="prisma+postgres://placeholder" ./node_modules/.bin/prisma generate
```

The last command must succeed **without** `DIRECT_DATABASE_URL` set — that is
finding 3's acceptance test. Report the real output of each; do not claim a
command you did not run.

---

## The raw reviewer comments, verbatim

### apps/couriers-api/src/platform/jwt.ts

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub> Verify bearer tokens with the platform public key**

When a route uses `security: 'session'`, every real platform access token will be rejected because this verifies it as an HMAC token using `SESSION_COOKIE_SECRET`, while `apps/api/src/platform/jwt.ts` signs and verifies provider tokens with RS256. The session-cookie secret is for the separately sealed cookie architecture, so Couriers must verify bearer tokens using the identity API's public key/JWKS instead.

AGENTS.md reference: [AGENTS.md:L90-L92](https://github.com/876-workspace/876/blob/58f756de79689b35d8940c172d54477589e94f2f/AGENTS.md#L90-L92)

Useful? React with 👍 / 👎.

### apps/couriers-api/package.json

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub> Run the boundary gate from the repository checks**

Checked the root `package.json`, `turbo.json`, and `.github/workflows`: `pnpm check` runs only Turbo's `lint`, `typecheck`, and `test` tasks, and no workflow invokes this `boundaries` script. Consequently, violations of the new module/Prisma dependency rules pass the repository's advertised pre-commit and CI checks; wire this command into an executed task or workflow.

Useful? React with 👍 / 👎.

### apps/couriers-api/prisma.config.ts

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub> Do not require an optional direct database URL**

When a developer follows this package's README and configures the required `DATABASE_URL` but omits the documented-optional `DIRECT_DATABASE_URL`, the advertised `pnpm db:generate` command fails while evaluating `env('DIRECT_DATABASE_URL')` before Prisma can generate anything. Either make the variable required in the documented setup or avoid eagerly requiring it for generation and reserve it for commands that actually need a direct connection.

Useful? React with 👍 / 👎.
