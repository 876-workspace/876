# Brief: add a Worker secret preflight check

## Why

Signing in to Couriers in production redirected every user to `/onboarding`,
which then rendered "Setup is unavailable." The cause was **not** application
code or data — the `876-couriers` Cloudflare Worker was simply missing the
`API_INTERNAL_KEY` secret.

Every platform call Couriers makes is `AdminDep` and authenticates with
`x-internal-key` (`packages/core/src/platform/runtime.ts:29` falls back to
`process.env.API_INTERNAL_KEY`). With the secret absent, every call 401s, and
the callers absorb that into "no memberships" / "no access" / "setup
unavailable" — a misconfigured deployment is indistinguishable from a brand-new
user. It worked locally because `apps/couriers/.env` has the key.

The requirement was already documented (`docs/cloudflare.md:217` lists
`API_INTERNAL_KEY` under **876 couriers**) and still got missed, because nothing
mechanically verifies it. Add that mechanism.

Verified state at the time of writing (do not re-probe; treat as the fixture for
your manifest):

| Worker         | has `API_INTERNAL_KEY`?                                     |
| -------------- | ----------------------------------------------------------- |
| `876-api`      | yes                                                         |
| `876-console`  | yes                                                         |
| `876-couriers` | **no — the bug**                                            |
| `876-billing`  | **no — documented as required at `docs/cloudflare.md:214`** |
| others         | no                                                          |

## Your task

Add `scripts/check-worker-secrets.mjs` — a Node script (ESM, no new
dependencies; the repo is pnpm + Node >= 22.13) that:

1. Holds a **manifest of required secret names per Worker**, derived from the
   "Production key inventory" section of `docs/cloudflare.md` (lines ~205-220).
   Cover: `876-api`, `876-console`, `876-billing`, `876-couriers`,
   `876-widgets-api`. Only list names that are genuinely required for the app to
   function — do not invent requirements, and do not list `NEXT_PUBLIC_*` build
   variables (they are inlined at build time, not Worker secrets).
2. For each Worker, runs `npx wrangler secret list --name <worker>` and parses
   the JSON array of `{ name, type }`.
3. Diffs actual against required and reports **missing** names per Worker.
4. Exits non-zero if anything is missing; exits 0 with a clear "all present"
   summary otherwise.
5. Accepts an optional Worker name argument to check just one
   (`node scripts/check-worker-secrets.mjs 876-couriers`).

Hard requirements:

- **Never print a secret value.** `wrangler secret list` only returns names —
  keep it that way; do not add any command that could surface a value.
- Handle the "worker does not exist" and "not authenticated" cases with a clear
  message and a non-zero exit, distinct from "secret missing".
- Do not fail the whole run on the first Worker error — check them all, then
  summarise. A single report of everything wrong is the point.
- Keep the output readable: one block per Worker, missing names listed plainly.

Then:

- Add a root `package.json` script: `"check:worker-secrets": "node scripts/check-worker-secrets.mjs"`.
  Place it next to the existing `check:session-secret` entry, matching its style.
- Update `docs/cloudflare.md` so the "Production key inventory" section points at
  the script as the way to verify a deployment, and note that a missing
  `API_INTERNAL_KEY` presents as users being routed to onboarding rather than as
  an obvious auth error.

Look at `scripts/check-session-secret.mjs` first and match its structure, exit-code
conventions, and output style — this script should read as a sibling of it, not a
new idiom.

## Explicitly out of scope

- Do not set, rotate, or read any secret.
- Do not wire this into a deploy or CI workflow file in this change — adding the
  script and the npm entry is enough; wiring is a follow-up decision.
- Do not touch application code, Sentry config, or any app's `src/`.

## Verification (run these, report the output)

```bash
node scripts/check-worker-secrets.mjs 876-console
node scripts/check-worker-secrets.mjs
```

The second must report `API_INTERNAL_KEY` missing on `876-couriers` and
`876-billing` and exit non-zero — that is the bug this exists to catch. Also run:

```bash
npx prettier --check scripts/check-worker-secrets.mjs package.json docs/cloudflare.md
```

## Rules

- Do **not** run `git add`, `git commit`, `git push`, or create branches.
- Report every file created or modified with a one-line summary each.
