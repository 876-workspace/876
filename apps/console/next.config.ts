import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

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
  // Allow HMR websocket connections from Gitpod and GitHub Codespaces preview URLs.
  allowedDevOrigins: ['**.gitpod.dev', '*.app.github.dev'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  transpilePackages: [
    '@876/analytics',
    '@876/billing',
    '@876/sdk',
    '@876/admin',
    '@876/core',
    '@876/ui',
  ],
  experimental: {
    optimizePackageImports: ['radix-ui', 'zod'],
    serverActions: {
      allowedOrigins: [
        'localhost:3002',
        '127.0.0.1:3002',
        '*.app.github.dev',
        '**.gitpod.dev',
        '876-misc.vercel.app',
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
  sourcemaps: {
    disable: true,
  },
})
