import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { normalizeOrgRole } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getPlatformClient } from '@/lib/876/platform-client'
import { MemberUpdateSchema } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ userId: string }> }

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('members:write')
  if (access.response) return access.response

  const { userId } = await context.params
  const platform = await getPlatformClient()
  const membershipResult = await platform.memberships.list({
    organization_id: access.context.orgId,
    user_id: userId,
    limit: 1,
  })
  const membership = membershipResult.data?.data[0]
  if (!membership || membership.status !== 'active')
    return apiError('An active organization member is required.', {
      status: 404,
    })

  const body = await request.json().catch(() => null)
  const parsed = MemberUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Select a valid role and access status.', { status: 422 })

  const result = await service.members.update(
    access.context.tenant.id,
    userId,
    parsed.data,
    {
      userId: access.context.userId,
      roleSlug: access.context.access.role.slug,
    },
    normalizeOrgRole(membership.role)
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('billing_member', result.data))
}
