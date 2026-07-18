import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SalespersonCreateSchema } from '@/types/salesperson'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const rows = await service.salespeople.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/salespeople',
      rows as unknown as Array<Record<string, unknown>>,
      'salesperson'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = SalespersonCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid salesperson details.', { status: 422 })

  const result = await service.salespeople.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('salesperson', result.data), { status: 201 })
}
