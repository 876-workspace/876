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
  transpilePackages: sharedTranspilePackages([
    '@876/account',
    '@876/billing',
    '@876/core',
    '@876/couriers',
    '@876/storage',
    '@876/widgets',
    '@876/sdk',
  ]),
  experimental: {
    optimizePackageImports: ['@base-ui/react', 'radix-ui'],
    serverActions: {
      allowedOrigins: [
        'localhost:3003',
        '127.0.0.1:3003',
        ...previewDevOrigins,
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
  sourcemaps: { disable: true },
})
