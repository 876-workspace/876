# 876 PWA and Serwist Architecture

876 product apps use a shared, build-time Serwist architecture. Service workers are compiled before the Next.js build and shipped as static `/sw.js` assets; no app may bundle a worker dynamically at request time.

## Shared owners

| Concern | Owner |
| --- | --- |
| Worker build | `scripts/build-serwist.mjs` |
| Standard authenticated-app worker | `scripts/serwist-shell-worker.ts` |
| Offline recovery runtime | `scripts/offline-recovery.ts` / `scripts/build-pwa-assets.mjs` |
| Browser registration lifecycle | `@876/ui/service-worker-registration` |
| Manifest, offline page, icons, worker headers | each app |

The build helper derives an app-specific cache namespace from the workspace package name, builds `/pwa/offline-recovery.js`, and writes the bundled worker to `public/sw.js`.

## Standard consumers

The standard shared shell worker is the default for authenticated 876 product apps that do not need product-specific offline behavior. Current consumers include:

- 876 Console
- 876 Couriers
- 876 Projects
- 876 Commerce

A standard consumer adds the shared build step to its workspace scripts:

```json
{
  "dev": "pnpm build:sw && next dev --turbopack --port <port>",
  "build:sw": "node ../../scripts/build-serwist.mjs",
  "build": "pnpm build:next",
  "build:next": "pnpm build:sw && NEXT_TELEMETRY_DISABLED=1 next build --webpack"
}
```

Its root layout mounts `ServiceWorkerRegistration` from `@876/ui/service-worker-registration`. Registration is enabled in production and when `NEXT_PUBLIC_PWA_TEST=1`. Normal development removes stale registrations and Cache Storage so an old worker cannot hydrate the current development build with stale assets.

Each app also owns:

- `src/app/manifest.ts`;
- `public/offline.html`;
- `public/pwa/icon-192.png`;
- `public/pwa/icon-512.png`;
- `public/pwa/icon-maskable-512.png`;
- `public/pwa/apple-touch-icon.png`;
- service-worker response headers that prevent `/sw.js` from being cached.

## Runtime policy

The shared shell worker is intentionally conservative. Navigation and same-origin application requests remain network-authoritative, and the precached offline document is used only when a document navigation cannot reach the network.

Do not add authenticated tenant or user data to Cache Storage merely to make an app feel more offline-capable. In particular, standard workers must not cache authoritative domain state such as Projects issues/comments or Commerce orders/customers/inventory/pricing.

Offline mutations, background queues, push handling, or domain-specific runtime caches require an explicit product design and a custom worker.

## Custom workers

`build-serwist.mjs` checks for `src/app/sw.ts`. If that file exists, it becomes the worker entry point; otherwise the shared shell worker is used.

876 Invoice is a custom-worker consumer because it owns product-specific Background Sync and notification behavior. Its browser registration still uses the shared `@876/ui` component.

A new app-specific `sw.ts` must therefore represent a real product requirement, not a copy of the shared shell worker.

## Commerce storefronts

`apps/commerce` is the authenticated merchant workspace. Its manifest identifies **876 Commerce**.

Future public merchant storefront PWAs are a separate concern. Their install identity should come from the merchant/store (name, icon, theme, start URL), and any storefront caching policy must keep checkout, payments, final price validation, discounts, tax, shipping quotes, inventory validation, authentication state, and order submission network-authoritative.

## Verification

For a standard consumer, verify at minimum:

1. `pnpm --filter <workspace> build:sw` writes `public/sw.js`.
2. `/manifest.webmanifest` and all declared icons resolve.
3. `/sw.js` is served as JavaScript with `Cache-Control: no-cache, no-store, must-revalidate` and `Service-Worker-Allowed: /`.
4. the worker registers at scope `/` in production or with `NEXT_PUBLIC_PWA_TEST=1`;
5. document navigation falls back to `offline.html` while offline;
6. restoring network connectivity recovers from the offline page;
7. authenticated redirects still work while the page is worker-controlled;
8. a new worker version takes control without leaving stale client chunks active.

Do not treat Serwist `NetworkOnly` `no-response` console messages as proof of an application render failure. Follow `.claude/rules/production-render-errors.md` and inspect the server/service logs for render failures.
