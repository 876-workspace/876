import { createMDX } from 'fumadocs-mdx/next'
import type { NextConfig } from 'next'

const withMDX = createMDX()

const nextConfig: NextConfig = {
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  // Allow HMR websocket connections from Ona/Gitpod and GitHub Codespaces preview URLs.
  allowedDevOrigins: ['**.gitpod.dev', '*.app.github.dev'],
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
