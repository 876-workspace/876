import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import type { AdminAuditEventCreateParams } from '@876/admin'

export const runtime = 'nodejs'

/**
 * Proxies audit event creation server-side so the app API key never reaches
 * the browser bundle. No auth required — audit events are fire-and-forget
 * telemetry and are always attributed to the app, not the caller.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request
    .json()
    .catch(() => null)) as AdminAuditEventCreateParams | null
  if (!body?.event || !body?.app_name) {
    return apiJson(
      { error: 'event and app_name are required.' },
      { status: 400 }
    )
  }

  const { data, error } = await $876.auditEvents.create(body)
  if (error) {
    return apiJson(
      { error: error.message ?? 'Failed to record event.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
