# GPT Web Report: Projects and Commerce PWA

- Run ID: `2026-09-15-projects-commerce-pwa`
- Branch: `feat/projects-commerce-pwa`
- Date: 2026-09-15
- Verification status: **not executed; verification is the orchestrator's**

## Summary

Added the existing shared static Serwist/PWA architecture to 876 Projects and 876 Commerce and consolidated browser service-worker registration under `@876/ui` rather than creating additional app-local copies.

Projects and Commerce deliberately use `scripts/serwist-shell-worker.ts`; neither app adds a custom `src/app/sw.ts`. Authenticated domain data therefore remains network-authoritative. Invoice keeps its existing custom worker and now shares only the browser registration lifecycle.

## Phase status and test counts

| Phase | Status | New `it()` cases |
| --- | --- | ---: |
| Shared registration extraction | Complete | 3 |
| Existing consumer migration | Complete | 0 |
| Projects PWA foundation | Complete | 0 |
| Commerce PWA foundation | Complete | 0 |
| PWA architecture documentation | Complete | 0 |
| Executable verification | Not executed from GPT Web | 0 |

**Total new `it()` cases: 3.**

## Files changed

### Shared PWA infrastructure

- `packages/ui/src/components/service-worker-registration.tsx` — canonical browser registration/update/dev-cleanup lifecycle, promoted from the former Console-local implementation.
- `packages/ui/src/components/service-worker-registration.test.tsx` — covers PWA-test registration at `/`, disabled-registration cleanup checks, and listener teardown.
- `apps/console/src/components/providers/service-worker-registration.tsx` — removed by promotion to `@876/ui`.
- `apps/couriers/src/components/providers/service-worker-registration.tsx` — removed; Couriers now consumes the shared component.
- `apps/invoice/src/components/providers/service-worker-registration.tsx` — removed; Invoice now consumes the shared component while retaining its custom worker.
- `apps/console/src/app/layout.tsx` — imports shared registration from `@876/ui`.
- `apps/couriers/src/app/layout.tsx` — imports shared registration from `@876/ui`.
- `apps/invoice/src/app/layout.tsx` — imports shared registration from `@876/ui`.

### 876 Projects

- `apps/projects/package.json` — adds `build:sw` and runs it before dev/production Next builds.
- `apps/projects/next.config.ts` — serves `/sw.js` with JavaScript content type, no-cache policy, CSP, and root service-worker scope permission.
- `apps/projects/src/app/layout.tsx` — registers the shared worker, adds install/Apple PWA metadata, and corrects the stale CRM-style app description.
- `apps/projects/src/app/manifest.ts` — adds the standalone Projects manifest and shortcuts to the existing `/projects`, `/board`, and `/issues` routes.
- `apps/projects/public/_headers` — static/service-worker cache headers.
- `apps/projects/public/offline.html` — branded static offline recovery page.
- `apps/projects/public/pwa/icon-source.svg` — source artwork for the current 876 icon set.
- `apps/projects/public/pwa/icon-192.png` — install icon.
- `apps/projects/public/pwa/icon-512.png` — install icon.
- `apps/projects/public/pwa/icon-maskable-512.png` — maskable install icon.
- `apps/projects/public/pwa/apple-touch-icon.png` — Apple home-screen icon.

### 876 Commerce

- `apps/commerce/package.json` — adds `build:sw` and runs it before dev/production Next builds.
- `apps/commerce/next.config.ts` — serves `/sw.js` with JavaScript content type, no-cache policy, CSP, and root service-worker scope permission.
- `apps/commerce/src/app/layout.tsx` — registers the shared worker and adds manifest, Apple, viewport, and install metadata.
- `apps/commerce/src/app/manifest.ts` — adds the standalone Commerce merchant-workspace manifest.
- `apps/commerce/public/_headers` — static/service-worker cache headers.
- `apps/commerce/public/offline.html` — branded static offline recovery page.
- `apps/commerce/public/pwa/icon-source.svg` — source artwork for the current 876 icon set.
- `apps/commerce/public/pwa/icon-192.png` — install icon.
- `apps/commerce/public/pwa/icon-512.png` — install icon.
- `apps/commerce/public/pwa/icon-maskable-512.png` — maskable install icon.
- `apps/commerce/public/pwa/apple-touch-icon.png` — Apple home-screen icon.

### Documentation and run tracking

- `docs/pwa.md` — new focused architecture document covering shared ownership, standard/custom worker policy, Commerce storefront boundary, and verification requirements.
- `plans/2026-09-15-projects-commerce-pwa/plan.md` — implementation plan/tracker.
- `plans/2026-09-15-projects-commerce-pwa/reports/gpt-web/2026-09-15-projects-commerce-pwa.md` — this report.

## Decisions

1. **Shared shell worker for Projects and Commerce.** Neither app has a product requirement that justifies a custom service worker yet.
2. **One registration implementation.** The newest Console behavior became `@876/ui/service-worker-registration`; Projects and Commerce do not add local copies.
3. **Invoice remains special.** Its Background Sync/push worker remains app-owned; only registration is shared.
4. **Commerce admin and storefronts remain separate PWA concerns.** The new Commerce manifest describes the authenticated merchant workspace. Future storefront manifests must use merchant identity and a separately reviewed caching policy.
5. **No authenticated domain caching.** Projects issues/comments and Commerce orders/customers/inventory/pricing remain network-authoritative.
6. **Projects shortcuts were retained after route verification.** `/projects`, `/board`, and `/issues` all exist in the authenticated Projects route group.

## Deliberate gaps

### Product-specific icon artwork

The connector cannot safely author new PNG binaries. Projects and Commerce therefore reuse the repository's existing 876 PWA icon blobs, which are valid non-empty assets, rather than fabricating or corrupting binary files. The checked-in SVG source matches those shared icons.

If distinct Projects/Commerce install artwork is desired, regenerate the four PNG sizes locally from approved product-specific source artwork and replace the current blobs in a design follow-up.

### Existing parked Cloudflare document

`docs/cloudflare.md` is explicitly parked and its historical Serwist paragraph predates Projects/Commerce. Reconstructing that large file through a whole-file connector writer would be unnecessarily risky. `docs/pwa.md` is now the focused current architecture document. A local follow-up may add a cross-link from the parked guide if useful.

### Next.js local agent docs

`apps/projects/AGENTS.md` requires reading the matching guides under local `node_modules/next/dist/docs/`. Those files are not accessible through this connector seat. Next metadata/layout changes were therefore kept to already-established repository patterns and must be checked locally against the installed Next.js 16 docs.

## Risks to review first

1. Run the shared UI test suite to confirm the new service-worker lifecycle tests against the actual jsdom/Vitest environment.
2. Run both production builds so `build-serwist.mjs` proves all required assets resolve and writes `public/sw.js` for each app.
3. Exercise a signed-out navigation under worker control to confirm redirect handling remains correct.
4. Verify installability and Apple/Android icon presentation in real browser tooling.
5. Decide whether generic 876 install artwork is acceptable or should receive product-specific design assets before release.

## Verification not executed by GPT Web

Per repository operating rules, GPT Web did **not** run or claim results for lint, typecheck, tests, Next builds, Serwist builds, structure checks, RSC checks, browser tests, or manual PWA installation/offline behavior.

Recommended local/orchestrator commands:

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

Manual browser verification should use `NEXT_PUBLIC_PWA_TEST=1` where appropriate and confirm `/manifest.webmanifest`, `/sw.js`, scope `/`, offline fallback/recovery, authenticated redirects, and worker-update takeover.
