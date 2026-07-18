import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Revokes a connected app for the signed-in user, then redirects back to the
 * linked-apps screen. Submitted as a native `<form method="post">` so it works
 * without client JS. Pure transport over `$876.oauthGrants.revoke`.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getAuthSession()
  const formData = await request.formData().catch(() => null)
  const grantId = formData?.get('grant_id')

  if (isSignedSession(session) && typeof grantId === 'string' && grantId) {
    await $876.oauthGrants.revoke(session.user.id, grantId)
  }

  return Response.redirect(
    new URL('/app/linked-apps', request.nextUrl.origin),
    303
  )
}
