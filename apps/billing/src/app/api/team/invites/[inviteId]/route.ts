import { apiError, apiSuccess } from '@876/core/api'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getContext } from '@/lib/auth/billing-context'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
): Promise<Response> {
  const context = await getContext()
  if (!context)
    return apiError('Billing authentication is required.', { status: 401 })
  if (!context.permissions.includes('members:write'))
    return apiError('You do not have permission to revoke invites.', {
      status: 403,
    })

  const { inviteId } = await params
  const platform = await getPlatformClient()
  const { data, error } = await platform.invites.revoke(context.orgId, inviteId)
  if (error || !data)
    return apiError(error?.message ?? 'Failed to revoke the invite.', {
      status: 400,
    })

  return apiSuccess(data)
}
