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
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  allowedDevOrigins: ['127.0.0.1', ...previewDevOrigins],
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
    '@876/admin',
    '@876/analytics',
    '@876/billing',
    '@876/core',
    '@876/crm',
    '@876/platform',
    '@876/sdk',
    '@876/storage',
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
