# Brief: disable source map generation and Next.js telemetry

## Why

Two build-time concerns, both across the six Next.js apps (`apps/876`,
`apps/console`, `apps/billing`, `apps/couriers`, `apps/enterprise`,
`apps/widgets-api`):

1. **Source maps.** `withSentryConfig` generates (and tries to upload) source
   maps by default. We deliberately did **not** wire `SENTRY_AUTH_TOKEN`, so
   nothing is ever uploaded — the maps are produced, bloat the build, slow
   Workers Builds, and risk shipping readable source. Turn generation off.
2. **Next.js telemetry.** Next phones home during builds. Disable it so Workers
   Builds and CI don't send anonymous usage data.

## 1. Disable Sentry source maps

In each app's `next.config.ts`, inside the existing `withSentryConfig(nextConfig, {...})`
options object, add:

```ts
sourcemaps: { disable: true },
```

Read the existing options object first and add the key alongside what is
already there — do **not** replace or reorder existing options (`org`,
`project`, `silent`, `widenClientFileUpload`, etc. may be present).

Also ensure each app's `nextConfig` does not enable
`productionBrowserSourceMaps`. It defaults to `false`; only add an explicit
`productionBrowserSourceMaps: false` if the app currently sets it to `true`.
Do not add the key where it is absent — the default is already correct and an
extra key is noise.

## 2. Disable Next.js telemetry

Set `NEXT_TELEMETRY_DISABLED=1` for every Next build so it applies in Workers
Builds, GitHub Actions and local runs alike.

Prefer the **least duplicated** place that actually works. Inspect
`turbo.json` and the root `package.json` first:

- If `turbo.json` has a `globalEnv` / `env` mechanism that can carry the value
  to every `build` task, use that — one edit beats six.
- Otherwise, prefix the Next build script in each app's `package.json`, e.g.
  `"build:next": "NEXT_TELEMETRY_DISABLED=1 next build"`. Note several apps use
  a `build:next` script that OpenNext invokes (see `open-next.config.ts`'s
  `buildCommand`) — make sure you prefix the script that actually runs
  `next build`, not the OpenNext wrapper, or telemetry stays on.

State in your report which mechanism you chose and why.

Do **not** run `npx next telemetry disable` — that writes to a machine-local
config file and would not affect CI or Workers Builds.

## Constraints

- Do not change any Sentry DSN, `vars` block, or runtime config — that work is
  already committed on this branch.
- Do not add `SENTRY_AUTH_TOKEN` or source map upload wiring.
- Do not touch `open-next.config.ts`.
- Do not commit. The orchestrating agent stages and commits.

## Verification (report each)

```bash
# 1. Source maps disabled in all six
grep -l 'sourcemaps' apps/*/next.config.ts

# 2. Telemetry disabled (turbo.json or all six package.json)
grep -rn 'NEXT_TELEMETRY_DISABLED' turbo.json apps/*/package.json

# 3. Configs still typecheck and tests still pass
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers typecheck
pnpm --filter @876/console test

# 4. Formatting
pnpm exec prettier --check "apps/*/next.config.ts" "apps/*/package.json" turbo.json
```
