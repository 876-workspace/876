import { apiError, apiSuccess } from '@876/core/api'
import { cookies } from 'next/headers'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { switchOrganizationInputSchema } from '@/types/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = switchOrganizationInputSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid organization identifier.', { status: 400 })

  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiError('Authentication is required.', {
      status: 401,
      code: 'auth/unauthorized',
    })

  const platform = await getPlatformClient()
  const membershipsResult = await platform.auth.getRoutingMemberships({
    userId: session.user.id,
    status: 'active',
  })
  const membership = membershipsResult.data?.data.find(
    (candidate) =>
      candidate.status === 'active' &&
      candidate.organization.id === parsed.data.organizationId &&
      candidate.organization.status === 'active'
  )
  if (membershipsResult.error || !membership)
    return apiError('Organization access is not permitted.', { status: 403 })

  const cookieStore = await cookies()
  cookieStore.set('billing_active_org', parsed.data.organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })

  return apiSuccess({ ok: true })
}
