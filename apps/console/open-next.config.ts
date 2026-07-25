import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * OpenNext Cloudflare adapter config for Console.
 * Incremental cache defaults to memory until an R2 binding is provisioned.
 * See docs/cloudflare.md.
 *
 * `pnpm build` is the OpenNext Worker build (Workers Builds default).
 * OpenNext must invoke a pure Next build — not `pnpm build` — or it recurses.
 */
export default {
  ...defineCloudflareConfig({}),
  buildCommand: 'pnpm run build:next',
}
