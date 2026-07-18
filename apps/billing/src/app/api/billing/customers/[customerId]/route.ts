import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CustomerUpdateSchema } from '@/types/customer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ customerId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('customers:read')
  if (access.response) return access.response

  const { customerId } = await context.params
  const row = await service.customers.retrieve(
    access.context.tenant.id,
    customerId
  )
  if (!row) return apiError('Customer not found.', { status: 404 })

  return apiSuccess(
    Resource('customer', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const { customerId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = CustomerUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid customer details.', { status: 422 })

  const result = await service.customers.update(
    access.context.tenant.id,
    customerId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('customer', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const { customerId } = await context.params
  const result = await service.customers.delete(
    access.context.tenant.id,
    customerId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'customer', id: customerId, deleted: true })
}
