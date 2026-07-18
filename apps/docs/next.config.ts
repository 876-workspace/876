import { createMDX } from 'fumadocs-mdx/next'
import type { NextConfig } from 'next'

const withMDX = createMDX()

const nextConfig: NextConfig = {
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  transpilePackages: [
    '@876/analytics',
    '@876/core',
    '@876/sdk',
    'fumadocs-ui',
    'fumadocs-core',
  ],
  serverExternalPackages: ['shiki', 'twoslash', 'typescript'],
}

export default withMDX(nextConfig)
