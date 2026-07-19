import 'server-only'

import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'

import { err, ok, type ServiceResult } from '@/lib/service/result'

export type KbHost = 'console' | 'billing' | 'couriers' | 'enterprise' | '876'

export type KbAudience = 'end_user' | 'org_member' | 'platform_admin'
export type KbStatus = 'draft' | 'published' | 'archived'

function requireConvexUrl() {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return null
  return url
}

function requireServiceKey() {
  const key = process.env.WIDGETS_SERVICE_KEY
  if (!key) return null
  return key
}

export function getKbConvex() {
  const url = requireConvexUrl()
  if (!url)
    throw new Error(
      'CONVEX_URL is not set. Knowledge Base Convex is not configured.'
    )
  return new ConvexHttpClient(url)
}

export function serviceAuth(actorUserId: string, isAdmin = false) {
  const serviceKey = requireServiceKey()
  if (!serviceKey) throw new Error('WIDGETS_SERVICE_KEY is not set.')
  return { serviceKey, actorUserId, isAdmin }
}

/** Function refs — regenerated typed `api` after `npx convex codegen`. */
export const kbFns = anyApi

export async function runKbQuery<T>(
  label: string,
  run: (client: ConvexHttpClient) => Promise<T>
): Promise<ServiceResult<T>> {
  try {
    if (!requireConvexUrl())
      return err(
        'Knowledge Base Convex is not configured.',
        503,
        'widgets/kb-not-configured'
      )
    if (!requireServiceKey())
      return err(
        'Widgets service key is not configured.',
        503,
        'widgets/not-configured'
      )

    const client = getKbConvex()
    const data = await run(client)
    return ok(data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Knowledge Base request failed.'
    const status = /unauthorized|admin access/i.test(message)
      ? 403
      : /not found/i.test(message)
        ? 404
        : /required|invalid|slug|title|host/i.test(message)
          ? 400
          : 502
    console.error('[widgets-api/kb]', label, message)
    return err(message, status, 'widgets/kb-error')
  }
}

export async function runKbMutation<T>(
  label: string,
  run: (client: ConvexHttpClient) => Promise<T>
): Promise<ServiceResult<T>> {
  return runKbQuery(label, run)
}
