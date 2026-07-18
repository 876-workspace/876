import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CustomerCreateSchema } from '@/types/customer'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('customers:read')
  if (access.response) return access.response

  const customers = await service.customers.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/customers',
      customers as unknown as Array<Record<string, unknown>>,
      'customer'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CustomerCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid customer details.', { status: 422 })

  const result = await service.customers.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('customer', result.data), { status: 201 })
}
