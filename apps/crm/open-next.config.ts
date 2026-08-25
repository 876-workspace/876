import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default {
  ...defineCloudflareConfig({}),
  buildCommand: 'pnpm run build:next',
}
