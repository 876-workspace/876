# Implementation Plan: Projects and Commerce PWA

- **Run ID:** `2026-09-15-projects-commerce-pwa`
- **Branch:** `feat/projects-commerce-pwa`
- **Status:** COMPLETED ✅ — local verification pending

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
2. Promote service-worker registration to `@876/ui/service-worker-registration` because multiple apps already owned near-identical copies.
3. Preserve Invoice's custom `src/app/sw.ts`; only its browser registration helper is shared.
4. Keep Projects and Commerce on `scripts/serwist-shell-worker.ts` until a documented product-specific offline/push requirement exists.
5. Treat the current Commerce app as the authenticated merchant workspace. Per-store storefront manifests/caching are a separate future phase.
6. Reuse the existing repository-owned 876 PWA icon blobs for this connector implementation; product-specific PNG artwork can replace them in a design follow-up.

## Dispatched briefs

None. This run was implemented directly through the GPT Web GitHub connector.

## Execution reports

- [x] [`reports/gpt-web/2026-09-15-projects-commerce-pwa.md`](./reports/gpt-web/2026-09-15-projects-commerce-pwa.md)

## Phase checklist

- [x] Read `CLAUDE.md` and `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read applicable reuse, naming, types, code-style, testing, error, app-structure, performance, production-render, git, and tracker rules.
- [x] Verify the current Serwist architecture and Projects/Commerce gaps.
- [x] Add shared service-worker registration component in `@876/ui`.
- [x] Migrate Console, Couriers, and Invoice registration imports to the shared component.
- [x] Add Projects Serwist build scripts, manifest, metadata, headers, offline page, and PWA assets.
- [x] Add Commerce Serwist build scripts, manifest, metadata, headers, offline page, and PWA assets.
- [x] Add focused shared-registration unit coverage (3 `it()` cases).
- [x] Add current PWA architecture documentation at `docs/pwa.md`.
- [x] Review final branch diff for duplicate/residual implementations and scope creep.
- [x] Write GPT Web implementation report.

## Verification commands

Verification was **not executed from GPT Web**; it remains the orchestrator/local shell responsibility.

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
pnpm --filter @876/projects-app build:sw
pnpm --filter @876/projects-app build
pnpm --filter @876/commerce-app lint
pnpm --filter @876/commerce-app typecheck
pnpm --filter @876/commerce-app test
pnpm --filter @876/commerce-app build:sw
pnpm --filter @876/commerce-app build
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/invoice-app typecheck
pnpm check:rsc-boundaries
node scripts/check-app-structure.mjs console couriers projects commerce
```

Also verify `/manifest.webmanifest`, `/sw.js`, installability, service-worker scope, offline fallback/recovery, dev cleanup, authenticated redirects, and worker-update reload behavior in Chromium with `NEXT_PUBLIC_PWA_TEST=1` where applicable.

## Handoff state

Implementation is complete on `feat/projects-commerce-pwa`. The remaining work is executable verification from a shell-enabled/local orchestrator and any follow-up replacement of the shared 876 install icons with product-specific Projects/Commerce artwork.

The local `node_modules/next/dist/docs/` guides required by generated Next agent rules are not accessible through this connector; Next-specific edits were kept aligned to already-established repository patterns and must be checked locally against the installed Next.js 16 docs.

## PR preparation summary

Implemented shared registration, Projects and Commerce PWA build/runtime wiring, install manifests and assets, offline recovery, safe worker headers, focused unit coverage, and current architecture documentation. See the GPT Web report for the full changed-file inventory, deliberate gaps, risks, and verification commands.
