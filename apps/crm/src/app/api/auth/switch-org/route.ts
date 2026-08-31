import { cookies } from 'next/headers'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/services/platform'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = switchOrgSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'invalid_request',
          message: 'Enter a valid organization identifier.',
        },
      },
      { status: 400 }
    )
  }

  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'auth/unauthorized',
          message: 'Authentication is required.',
        },
      },
      { status: 401 }
    )
  }

  const platform = await getPlatformClient()
  const membershipsResult = await platform.memberships.listRouting({
    userId: session.user.id,
    status: 'active',
  })
  const membership = membershipsResult.data?.data.find(
    (candidate) =>
      candidate.status === 'active' &&
      candidate.organization.id === parsed.data.organizationId &&
      candidate.organization.status === 'active'
  )
  if (membershipsResult.error || !membership) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'forbidden',
          message: 'Organization access is not permitted.',
        },
      },
      { status: 403 }
    )
  }

  const cookieStore = await cookies()
  cookieStore.set('crm_active_org', parsed.data.organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  })

  return Response.json({ data: { ok: true }, error: null })
}
