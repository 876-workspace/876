import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { RoleCreateSchema } from '@/types/access'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('roles:read')
  if (access.response) return access.response

  const roles = await service.roles.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/roles',
      roles as unknown as Array<Record<string, unknown>>,
      'billing_role'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('roles:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = RoleCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid role details and permissions.', {
      status: 422,
    })

  const result = await service.roles.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('billing_role', result.data), {
    status: 201,
  })
}
