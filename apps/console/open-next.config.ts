import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * OpenNext Cloudflare adapter config for Console.
 * Incremental cache defaults to memory until an R2 binding is provisioned.
 * See docs/cloudflare.md.
 */
export default defineCloudflareConfig({})
