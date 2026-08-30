import { apiJson } from '@876/core/api'
import type { AdminAuditEventCreateParams } from '@876/admin'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return apiJson({ error: 'Authentication required.' }, { status: 401 })
  }

  const body = (await request
    .json()
    .catch(() => null)) as AdminAuditEventCreateParams | null
  if (!body) return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const result = await $876.auditEvents.create({
    ...body,
    userId: session.user.id,
  })
  if (result.error) return apiJson({ error: result.error }, { status: 502 })

  return apiJson({ data: result.data })
}
