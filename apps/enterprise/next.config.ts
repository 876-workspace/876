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
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  transpilePackages: ['@876/analytics', '@876/sdk', '@876/core', '@876/ui'],
  experimental: {
    optimizePackageImports: ['@base-ui/react', 'radix-ui', 'zod'],
    serverActions: {
      allowedOrigins: ['localhost:3001', '127.0.0.1:3001', '*.app.github.dev'],
    },
  },
}

export default nextConfig
