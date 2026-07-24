import { withSentryConfig } from '@sentry/nextjs'
import { withSerwist } from '@serwist/turbopack'
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
  // Allow HMR websocket connections from Ona/Gitpod and GitHub Codespaces preview URLs.
  allowedDevOrigins: ['**.gitpod.dev', '*.app.github.dev'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  transpilePackages: ['@876/analytics', '@876/sdk', '@876/core', '@876/ui'],
  experimental: {
    optimizePackageImports: [
      '@base-ui/react',
      '@tanstack/react-form',
      'radix-ui',
      'zod',
    ],
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '*.app.github.dev',
        '**.gitpod.dev',
        '876-app.vercel.app',
        '876-app.netlify.app',
      ],
    },
  },
}

export default withSentryConfig(withSerwist(nextConfig), {
  org: 'efesto',

  project: '876-0b',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  sourcemaps: {
    disable: true,
  },

  webpack: {
    automaticVercelMonitors: true,

    treeshake: {
      removeDebugLogging: true,
    },
  },
})
