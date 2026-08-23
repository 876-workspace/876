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
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  transpilePackages: ['@876/analytics', '@876/sdk', '@876/core', '@876/ui'],
  experimental: {
    optimizePackageImports: ['@base-ui/react', 'radix-ui', 'zod'],
    serverActions: {
      allowedOrigins: [
        'localhost:3001',
        '127.0.0.1:3001',
        ...previewDevOrigins,
      ],
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: 'efesto',
  project: '876-enterprise',
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
