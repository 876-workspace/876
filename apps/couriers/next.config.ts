import path from 'node:path'

import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

import { externalizePrismaWasm } from '../../scripts/prisma-wasm-external.mjs'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const nextConfig: NextConfig = {
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  productionBrowserSourceMaps: false,
  // Auto-memoizes components/hooks to cut client re-render churn during
  // navigation and interaction. Build-time transform only, so it is safe on
  // @opennextjs/cloudflare (unlike cacheComponents — see navigation-performance.md
  // Rule 5 / OpenNext #1225). Requires babel-plugin-react-compiler.
  reactCompiler: true,
  webpack: externalizePrismaWasm,
  // Trace from the monorepo root so the include globs below can reach the
  // pnpm store. This matches Next's own monorepo auto-inference, so it does
  // not change the traced output layout OpenNext already consumes.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // `pg`'s Prisma adapter opens its socket through `pg-cloudflare`, but
  // `pg/lib/stream.js` hides that `require('pg-cloudflare')` behind a runtime
  // `isCloudflareRuntime()` check. @vercel/nft cannot statically resolve the
  // dynamic require, so it copies only `pg-cloudflare/package.json` and the
  // `default` `dist/empty.js` (which exports `CloudflareSocket === undefined`).
  // On the Worker the real `workerd`-condition files are then missing, so
  // `new CloudflareSocket()` throws `TypeError: … is not a constructor` and
  // every DB-backed page fails with RSC error #441. Force the real socket
  // (dist + esm) into the trace so OpenNext's workerd-condition esbuild pass
  // resolves it. See OpenNext #1214 and node-postgres #3493.
  outputFileTracingIncludes: {
    '**/*': [
      'node_modules/.pnpm/pg-cloudflare@*/node_modules/pg-cloudflare/dist/**',
      'node_modules/.pnpm/pg-cloudflare@*/node_modules/pg-cloudflare/esm/**',
    ],
  },
  // Allow HMR websocket connections from Ona/Gitpod and GitHub Codespaces preview URLs.
  allowedDevOrigins: ['127.0.0.1', '**.gitpod.dev', '*.app.github.dev'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
  // The management workspace moved from /org/<slug>/… to /<slug>/…. Both rules
  // are needed: the `:path*` form does not reliably match the bare
  // /org/<slug> dashboard URL, which is the one most likely to be bookmarked.
  async redirects() {
    return [
      {
        source: '/org/:orgSlug',
        destination: '/:orgSlug',
        permanent: true,
      },
      {
        source: '/org/:orgSlug/:path*',
        destination: '/:orgSlug/:path*',
        permanent: true,
      },
    ]
  },
  transpilePackages: [
    '@876/billing',
    '@876/sdk',
    '@876/core',
    '@876/ui',
    '@876/widgets',
  ],
  experimental: {
    optimizePackageImports: ['@base-ui/react', 'radix-ui'],
    serverActions: {
      allowedOrigins: [
        'localhost:3003',
        '127.0.0.1:3003',
        '*.app.github.dev',
        '**.gitpod.dev',
      ],
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'efesto',
  project: '876-couriers',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  sourcemaps: {
    disable: true,
  },
})

// OpenNext Cloudflare local bindings (no-op when not using wrangler preview).
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
initOpenNextCloudflareForDev()
