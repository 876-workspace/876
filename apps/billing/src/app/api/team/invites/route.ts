import { apiError, apiSuccess } from '@876/core/api'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getContext } from '@/lib/auth/billing-context'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const context = await getContext()
  if (!context)
    return apiError('Billing authentication is required.', { status: 401 })
  if (!context.permissions.includes('members:read'))
    return apiError('You do not have permission to view invites.', {
      status: 403,
    })

  const platform = await getPlatformClient()
  const { data, error } = await platform.invites.list(context.orgId)
  if (error || !data)
    return apiError(error?.message ?? 'Failed to load invites.', {
      status: 400,
    })

  return apiSuccess({ object: 'list', data: data.data })
}

export async function POST(request: Request): Promise<Response> {
  const context = await getContext()
  if (!context)
    return apiError('Billing authentication is required.', { status: 401 })
  if (!context.permissions.includes('members:write'))
    return apiError('You do not have permission to invite members.', {
      status: 403,
    })

  const body = (await request.json()) as { email?: unknown; role?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return apiError('An email address is required.', { status: 400 })
  const role =
    typeof body.role === 'string' && body.role ? body.role : undefined

  const platform = await getPlatformClient()
  const { data, error } = await platform.invites.create(context.orgId, {
    email,
    role,
  })
  if (error || !data)
    return apiError(error?.message ?? 'Failed to send the invite.', {
      status: 400,
    })

  return apiSuccess(data)
}
