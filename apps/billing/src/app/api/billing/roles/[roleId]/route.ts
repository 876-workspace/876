import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { RoleUpdateSchema } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ roleId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('roles:read')
  if (access.response) return access.response

  const { roleId } = await context.params
  const role = await service.roles.retrieve(access.context.tenant.id, roleId)
  if (!role) return apiError('Role not found.', { status: 404 })

  return apiSuccess(role)
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('roles:write')
  if (access.response) return access.response

  const { roleId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = RoleUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid role details and permissions.', {
      status: 422,
    })

  const result = await service.roles.update(
    access.context.tenant.id,
    roleId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('billing_role', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('roles:write')
  if (access.response) return access.response

  const { roleId } = await context.params
  const result = await service.roles.delete(access.context.tenant.id, roleId)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'billing_role', ...result.data })
}
