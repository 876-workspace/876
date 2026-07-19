import 'server-only'

import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'

/**
 * Server-only Convex client for Knowledge Base.
 * Notepad and other widget rows stay on Widgets Postgres.
 */
export function getConvexClient() {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url)
    throw new Error(
      'CONVEX_URL is not set. Configure the Knowledge Base Convex deployment.'
    )
  return new ConvexHttpClient(url)
}

export function serviceKey() {
  const key = process.env.WIDGETS_SERVICE_KEY
  if (!key) throw new Error('WIDGETS_SERVICE_KEY is not set.')
  return key
}

/**
 * Function references. Prefer typed `api` from convex/_generated/api after
 * `npx convex codegen`; anyApi keeps the bridge compiling before first deploy.
 */
export const kbApi = anyApi
