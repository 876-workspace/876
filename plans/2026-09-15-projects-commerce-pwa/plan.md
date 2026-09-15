# Implementation Plan: Projects and Commerce PWA

- **Run ID:** `2026-09-15-projects-commerce-pwa`
- **Branch:** `feat/projects-commerce-pwa`
- **Status:** IN_PROGRESS

## Overview

Add Serwist/PWA support to `@876/projects-app` and `@876/commerce-app` using the existing shared static-worker architecture. Consolidate the duplicated browser registration behavior into `@876/ui` so new apps do not add more local copies.

## Architectural scope

- `packages/ui` owns the reusable client-side service-worker registration component.
- `scripts/build-serwist.mjs` and `scripts/serwist-shell-worker.ts` remain the canonical build/runtime worker owners.
- Projects and Commerce use the shared shell worker; neither gets an app-local `src/app/sw.ts` in this phase.
- Projects/Commerce get app-local manifests, PWA assets, offline pages, and service-worker headers.
- Existing Console/Couriers/Invoice registration call sites migrate to the shared component without changing their product-specific worker behavior.
- Authenticated/product-domain data remains network-authoritative; this phase does not add offline mutations or domain caches.

## Key decisions

1. Use the shared static `public/sw.js` build path, not runtime `@serwist/turbopack` compilation.
2. Promote service-worker registration to `@876/ui/service-worker-registration` because multiple apps already own near-identical copies.
3. Preserve Invoice's custom `src/app/sw.ts`; only its browser registration helper is shared.
4. Keep Projects and Commerce on `scripts/serwist-shell-worker.ts` until a documented product-specific offline/push requirement exists.
5. Treat the current Commerce app as the authenticated merchant workspace. Per-store storefront manifests/caching are a separate future phase.

## Dispatched briefs

None. This run is being implemented directly through the GPT Web GitHub connector.

## Execution reports

- [ ] `reports/gpt-web/2026-09-15-projects-commerce-pwa.md`

## Phase checklist

- [x] Read `CLAUDE.md` and `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read applicable reuse, naming, types, code-style, testing, error, app-structure, performance, production-render, git, and tracker rules.
- [x] Verify the current Serwist architecture and Projects/Commerce gaps.
- [ ] Add shared service-worker registration component in `@876/ui`.
- [ ] Migrate Console, Couriers, and Invoice registration imports to the shared component.
- [ ] Add Projects Serwist build scripts, manifest, metadata, headers, offline page, and PWA assets.
- [ ] Add Commerce Serwist build scripts, manifest, metadata, headers, offline page, and PWA assets.
- [ ] Add/adjust automated verification coverage where safely possible from the connector seat.
- [ ] Review final branch diff for duplicate/residual implementations and scope creep.
- [ ] Write GPT Web implementation report and mark this plan complete.

## Verification commands

Verification is the orchestrator's responsibility from a shell-enabled seat. Recommended commands:

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
pnpm --filter @876/projects-app build
pnpm --filter @876/commerce-app lint
pnpm --filter @876/commerce-app typecheck
pnpm --filter @876/commerce-app test
pnpm --filter @876/commerce-app build
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/invoice-app typecheck
pnpm check:rsc-boundaries
node scripts/check-app-structure.mjs console couriers projects commerce
```

Also verify `/manifest.webmanifest`, `/sw.js`, installability, service-worker scope, offline fallback/recovery, dev cleanup, authenticated redirects, and worker-update reload behavior in Chromium with `NEXT_PUBLIC_PWA_TEST=1` where applicable.

## Handoff state

Implementation is in progress on the named branch. The local `node_modules/next/dist/docs/` guides required by generated Next agent rules are not accessible through this connector; Next-specific edits must therefore stay aligned to already-established repository patterns and be verified by the orchestrator locally.

## PR preparation summary

Pending implementation and verification.
