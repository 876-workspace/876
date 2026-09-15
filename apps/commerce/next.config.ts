import path from 'node:path'
import type { NextConfig } from 'next'
import { sharedTranspilePackages } from '../../scripts/shared-ui-packages.mjs'

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async headers() {
    return [
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
    '@876/account',
    '@876/core',
    '@876/workspace',
    '@876/commerce',
  ]),
}

export default nextConfig
