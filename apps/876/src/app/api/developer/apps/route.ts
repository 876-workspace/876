import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Registers a developer OAuth app for the signed-in user.
 *
 * Pure transport: authorizes the session, then calls `$876.apps.create`. All
 * business rules live in the API. See `.agents/rules/sdk-conventions.md`.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return apiJson({ error: 'Authentication required' }, { status: 401 })
  }

  void request

  return apiJson(
    { error: 'User-owned developer apps are not enabled.' },
    { status: 403 }
  )
}
