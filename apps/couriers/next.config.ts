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

export default nextConfig

// OpenNext Cloudflare local bindings (no-op when not using wrangler preview).
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
initOpenNextCloudflareForDev()
