# Vercel deploy gating

Every app in this repo is its own Vercel project pointed at the same monorepo,
so by default a single push queues thirteen production builds. That is what
exhausted the daily deployment quota on 2026-08-28 (`Deployment rate limited —
retry in 24 hours` on all thirteen projects).

Each app's `vercel.json` now declares an **Ignored Build Step**:

```json
"ignoreCommand": "node ../../scripts/vercel-ignore-build.mjs @876/console"
```

Vercel runs it from the project's Root Directory after cloning and before
install. Exit `0` skips the deployment; exit `1` proceeds.

## What the gate decides

`scripts/vercel-ignore-build.mjs` deploys an app when a changed file belongs to
that app or to a workspace it depends on. It compares against
`VERCEL_GIT_PREVIOUS_SHA` — the last commit this project actually deployed, so
nothing is missed when an earlier build was skipped — falling back to `HEAD^`
when that SHA is absent or outside a shallow clone.

| Change                               | Result                            |
| ------------------------------------ | --------------------------------- |
| `apps/crm/**`                        | `@876/crm-app` only               |
| `packages/core/**`, `packages/ui/**` | every dependent app               |
| `.claude/**`, `docs/**`, any `*.md`  | nothing                           |
| `pnpm-lock.yaml`, `turbo.json`, root | everything (no workspace owns it) |

## Why it is not a path filter, and not `turbo query affected`

A literal `apps/<name>/**` filter **under-deploys**. Eleven of the thirteen apps
depend on `@876/core`, so a change there has to redeploy all of them or
production quietly serves stale code. The dependency graph decides, not the
directory — the gate asks Turborepo for it.

`turbo query affected` on its own **over-deploys**. A changed file that belongs
to no workspace is attributed to the root package, and every package depends on
the root, so one edited rule file under `.claude/` marks all thirteen projects
affected. The gate therefore asks Turborepo only for the graph and resolves file
ownership itself, after prose has been filtered out.

Every unexpected condition — no comparable base ref, a file in no workspace, a
git or turbo failure — deploys. A wasted build is cheap; a silently skipped one
ships stale code.

## Adding an app

Add `ignoreCommand` to the new app's `vercel.json`, passing the workspace name
exactly as it appears in its `package.json`. No allowlist to maintain: the
workspace's dependencies come from the graph.

## Cloudflare

The `Workers Builds: *` checks are a separate system with its own per-project
build watch paths, configured in the Cloudflare dashboard rather than in this
repo. See `docs/cloudflare.md`.
