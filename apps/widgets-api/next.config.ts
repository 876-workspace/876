import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ['**.gitpod.dev', '*.app.github.dev'],
}

export default nextConfig
