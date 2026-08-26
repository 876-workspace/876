import path from 'node:path'

import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import { devResourceHosts } from '../../scripts/dev-preview.mjs'

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
  allowedDevOrigins: previewDevOrigins,
  // Trace from the monorepo root so shared workspace packages are included.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async redirects() {
    return [
      {
        source: '/catalogue',
        destination: '/products',
        permanent: true,
      },
      {
        source: '/catalog/items/:path*',
        destination: '/items/:path*',
        permanent: true,
      },
      {
        source: '/catalog/products/:path*',
        destination: '/products/:path*',
        permanent: true,
      },
      {
        source: '/catalog/plans/:path*',
        destination: '/plans/:path*',
        permanent: true,
      },
      {
        source: '/catalog/prices/:path*',
        destination: '/prices/:path*',
        permanent: true,
      },
      {
        source:
          '/sales/:resource(invoices|quotes|estimates|credit-notes|payments)/:path*',
        destination: '/:resource/:path*',
        permanent: true,
      },
    ]
  },
  transpilePackages: ['@876/billing', '@876/sdk', '@876/core', '@876/ui'],
  experimental: {
    optimizePackageImports: ['zod'],
    serverActions: {
      allowedOrigins: [
        'localhost:3004',
        '127.0.0.1:3004',
        ...previewDevOrigins,
      ],
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'efesto',
  project: '876-billing',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  sourcemaps: { disable: true },
})
