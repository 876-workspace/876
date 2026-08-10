# Brief — fix the three review findings on the couriers API service (PR #212)

Working directory: **`/root/projects/876`**, on branch **`feat/couriers-api`**
(the orchestrator checks it out for you). Do not create a worktree; do not
create, switch, or reset a branch; do not commit or push. Leave the work in the
tree.

Scope: **`apps/couriers-api/**`, plus `turbo.json` / the root `package.json` /
`.github/workflows/**` where finding 2 requires it.** Do not touch
`apps/couriers/**`, `packages/**`, any other app, any Prisma schema, or any
migration.

Binding rules: `.claude/rules/express-api.md`, `.claude/rules/testing.md`,
`.claude/rules/platform-services.md` (credential tiers),
`.claude/rules/naming.md` (env var names are contracts — do not rename one).

All three findings were verified against the code before this brief was written.

---

## 1 (P2, the substantive one) — a session bearer token is verified with the wrong key

`apps/couriers-api/src/platform/jwt.ts` verifies a bearer access token as an
**HMAC** token using `SESSION_COOKIE_SECRET`. The identity API signs platform
access tokens with **RS256** (`apps/api/src/platform/jwt.ts` — read it first, it
is the authority on the token's real shape, algorithm, issuer, audience and
claims). `SESSION_COOKIE_SECRET` belongs to the separately sealed cookie
architecture and has nothing to do with these tokens, so **every genuine access
token presented to a `security: 'session'` route is rejected**.

No route uses the `session` tier today, so this is latent — which is exactly why
it must be fixed before one does, rather than discovered by the first portal
route.

Fix it properly:

- Verify with the identity API's **public key / JWKS**, using the same algorithm,
  issuer and audience the identity API sets. Read how `apps/api` publishes the
  key (a JWKS endpoint, a configured PEM, or both) and follow that — do not
  invent a second convention.
- Honour the platform rule that **only `token_use === 'access'` authorizes a
  user** (`.claude/rules/express-api.md`). An id token or a client-credentials
  token presented as a session must be rejected.
- Configuration goes through `src/config/` (the Zod-validated settings object),
  never `process.env` at the call site. Add whatever key you need there with a
  clear name, wire it into `.env.example` and the service README, and make the
  failure mode explicit: if the verification key is not configured, the
  `session` tier must **reject every request**, never fall through to accepting
  one. Never fail open.
- If you fetch a JWKS over HTTP, cache it with a bounded TTL and handle a fetch
  failure by rejecting the request; do not let an unreachable JWKS become an
  accept, and do not fetch on every request.
- Keep the error contract: an `AppHttpError` with a stable namespaced code and a
  user-safe message. Do not leak a verification-library message to a client.

## 2 (P2) — the boundary gate is not actually enforced anywhere

`apps/couriers-api` has a `boundaries` script (`depcruise`), but `pnpm check`
runs only Turbo's `lint`, `typecheck`, and `test` tasks and no workflow invokes
it — so a violation of the module/Prisma rules passes every advertised check.
The root `CLAUDE.md` claims the module boundaries are a build error; today they
are not.

Wire it into the executed checks: add a Turbo task (or fold it into the task
`pnpm check` already runs) **and** make sure the CI workflow that gates pull
requests runs it for this app. Prove it: state in your report which command and
which workflow now execute it, and confirm by inspecting the workflow file, not
by assumption. Check whether `apps/couriers` has the same gap for its own
`boundaries` script and say so — but only fix `apps/couriers-api`'s wiring plus
the shared task/workflow plumbing needed for it.

## 3 (P2) — `db:generate` requires a variable documented as optional

`apps/couriers-api/prisma.config.ts` eagerly evaluates
`env('DIRECT_DATABASE_URL')`, so a developer who follows the README (which
documents `DATABASE_URL` as required and the direct URL as optional) cannot run
the advertised `pnpm db:generate` at all — generation does not connect to a
database and has no need of it.

Resolve the contradiction in **one** direction and make the code and the docs
agree: either stop requiring it for commands that do not need a direct
connection (preferred — `generate` does not), or make it required in the
documented setup. Migrations must still get a direct URL. Say which you chose and
why.

---

## Tests

Per `.claude/rules/testing.md`. At minimum:

- token verification: a valid RS256 access token accepted (sign one in the test
  with a generated key pair, do not hard-code a token); a token signed by the
  wrong key rejected; an expired token rejected; a wrong-issuer and a
  wrong-audience token rejected; a non-`access` `token_use` rejected; a malformed
  token rejected; and — separately — a `session`-tier request rejected when no
  verification key is configured, asserting the handler was never reached;
- each rejection asserts the **exact** error code and HTTP status, and both sides
  of the `{ data, error }` envelope;
- exact call counts on any JWKS fetch mock, including that a second request
  inside the TTL does **not** refetch.

Follow the existing harness style
(`src/modules/branches/__tests__/branches.test.ts`): supertest through the real
middleware chain, `vi.hoisted` + `vi.mock('@/db/client')`, no controller called
directly. Extend the OpenAPI snapshot only if the surface actually changes.

## Verify (foreground, all must pass)

```
pnpm --filter @876/couriers-api typecheck
pnpm --filter @876/couriers-api lint
pnpm --filter @876/couriers-api test
pnpm --filter @876/couriers-api boundaries
pnpm --filter @876/couriers-api build
npx prettier --check "apps/couriers-api/**/*.ts"
```

## Report

Per finding: what you changed and the decision you made where this brief offered
a choice (how the public key is obtained and configured, which command/workflow
now runs the boundary gate, which direction you resolved the direct-URL
contradiction). Then anything you believe is still wrong that you did not change,
and the verbatim final line of every command.
