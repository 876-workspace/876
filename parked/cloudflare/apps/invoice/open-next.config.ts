import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// `pnpm build` is the OpenNext Worker build (Workers Builds default).
// OpenNext must invoke a pure Next build — not `pnpm build` — or it recurses.
export default {
  ...defineCloudflareConfig({}),
  buildCommand: 'pnpm run build:next',
}
