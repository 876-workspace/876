# Brief — Make the Billing/Invoice resource-proxy surface explicit and testable

## Context you must read first

- `.claude/rules/app-api-routing.md` (NEW, this branch) — in particular
  "Pattern B — registered resource proxy". Condition 4 requires every proxied
  resource to be listed in an app-level manifest so the exposed surface is
  enumerable rather than implied by the file tree.
- `.claude/rules/product-api-boundary.md`, `.claude/rules/testing.md`.

## Goal

Billing and Invoice each expose ~30 and ~7 browser resources through
`[[...path]]` proxy routes. The set of resources they expose is currently
knowable only by listing directories. Make it a declared constant, make the
proxy helper refuse anything not declared, and add a test that the manifest and
the route tree cannot drift apart.

This is a small, mechanical, high-precision change. Do not redesign the proxy.

## Files you own (do not touch anything else)

- `apps/billing/src/lib/api/resource-manifest.ts` (new)
- `apps/billing/src/lib/api/resource-proxy.ts`
- `apps/billing/src/lib/api/resource-manifest.test.ts` (new)
- `apps/invoice/src/lib/api/resource-manifest.ts` (new)
- `apps/invoice/src/lib/api/resource-proxy.ts`
- `apps/invoice/src/lib/api/resource-manifest.test.ts` (new)

Do NOT touch `apps/console`, `packages/client`, `packages/crm`, `apps/crm*`,
or any `route.ts` file.

## Work, per app (billing and invoice, same shape)

1. `resource-manifest.ts` exports a frozen, alphabetically sorted
   `const PROXIED_RESOURCES = [...] as const` listing every top-level resource
   the app currently proxies, plus `type ProxiedResource = (typeof
   PROXIED_RESOURCES)[number]` and an `isProxiedResource(value: string)` type
   guard. Derive the list by reading the actual route directories under
   `src/app/api/` that contain a `[[...path]]/route.ts` — do not guess it.
   Billing's `widgets/notepad/*` and `team/invites/*` routes are NOT `[[...path]]`
   proxies; exclude them. Exclude `auth`, `health`, `ready`, `v1/openapi`,
   `activate`, `onboarding` for the same reason.

2. In `resource-proxy.ts`, narrow the factory's parameter to `ProxiedResource`
   and add a runtime guard at the top of the returned handler: if the resource is
   not in the manifest, return `apiError('Unknown resource.', { status: 404 })`
   without contacting the backend. The compile-time narrowing is the real
   protection; the runtime check is defence in depth against a cast.
   Keep every existing behaviour otherwise — session check, org resolution,
   credential attachment, request id — byte for byte.

3. `resource-manifest.test.ts` must fail the build on drift, in both directions:
   - read the route tree from disk (`node:fs`, relative to the app's
     `src/app/api`), collect every directory holding a `[[...path]]/route.ts`,
     and assert that set equals `new Set(PROXIED_RESOURCES)`;
   - assert `PROXIED_RESOURCES` is sorted and has no duplicates;
   - assert `isProxiedResource` returns false for a plausible non-member
     (`'admin'`, `'internal'`, `'..'`, `''`).
   Use the repo's Vitest conventions and assert exact values, not truthiness.

## Hard constraints

- **No `eslint-disable` comments. No `as any`.**
- Do not change any browser-visible URL, response shape, status code, or the
  backend path the proxy forwards to. This must be a pure hardening change.
- Do not commit.

## Verify before reporting done

```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
```

Check the workspace names in each app's `package.json` first; use the real ones.
Report exact test counts before and after, and paste any command that failed.
