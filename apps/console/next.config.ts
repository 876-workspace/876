import path from 'node:path'

import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

import { devResourceHosts } from '../../scripts/dev-preview.mjs'
import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'

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

const previewDevOrigins = devResourceHosts()

const nextConfig: NextConfig = {
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  productionBrowserSourceMaps: false,
  // Auto-memoizes components/hooks to cut client re-render churn during
  // navigation and interaction. Build-time transform only, so it is safe on
  // @opennextjs/cloudflare (unlike cacheComponents — see navigation-performance.md
  // Rule 5 / OpenNext #1225). Requires babel-plugin-react-compiler.
  reactCompiler: true,
  // Trace from the monorepo root, matching Next's own monorepo inference, so
  // the function bundle can reach the pnpm store.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  allowedDevOrigins: ['127.0.0.1', ...previewDevOrigins],
  async redirects() {
    return [
      // A workspace used to be a tab inside the organization record. It is now
      // a top-level context (`/workspace/<org>/<app>`), so links, bookmarks,
      // and open tabs pointing at the old shape still land. Temporary rather
      // than permanent: a 308 is cached by the browser indefinitely, and
      // `/orgs/[slug]/workspace` is a segment we may want back.
      {
        source: '/orgs/:orgSlug/workspace',
        destination: '/workspace/:orgSlug',
        permanent: false,
      },
      {
        source: '/orgs/:orgSlug/workspace/:path*',
        destination: '/workspace/:orgSlug/:path*',
        permanent: false,
      },
    ]
  },
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
  transpilePackages: sharedTranspilePackages([
    '@876/analytics',
    '@876/account',
    '@876/billing',
    '@876/core',
    '@876/crm',
    '@876/couriers',
    '@876/platform',
    '@876/storage',
    '@876/widgets',
    '@876/work',
    '@876/workspace',
  ]),
  experimental: {
    optimizePackageImports: ['radix-ui', 'zod'],
    serverActions: {
      allowedOrigins: [
        'localhost:3002',
        '127.0.0.1:3002',
        ...previewDevOrigins,
        '876-console.1876.workers.dev',
      ],
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'efesto',
  project: '876-console',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  sourcemaps: { disable: true },
})
