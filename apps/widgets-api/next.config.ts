import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

import { devResourceHosts } from '../../scripts/dev-preview.mjs'

const previewDevOrigins = devResourceHosts()

const nextConfig: NextConfig = {
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  productionBrowserSourceMaps: false,
  allowedDevOrigins: previewDevOrigins,
}

export default withSentryConfig(nextConfig, {
  org: 'efesto',
  project: '876-widgets-api',
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
