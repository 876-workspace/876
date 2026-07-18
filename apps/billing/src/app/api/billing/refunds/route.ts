import {
  apiError,
  apiSuccess,
  List,
  requirePermission,
} from '@/lib/api/billing-route'
import { RefundResource } from '@/lib/api/refund-resource'
import { service } from '@/lib/service'
import { RefundCreateSchema } from '@/types/refund'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const rows = await service.refunds.list(access.context.tenant.id)
  return apiSuccess({
    ...List('/api/v1/refunds', [], 'refund'),
    data: rows.map(RefundResource),
    total_count: rows.length,
  })
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = RefundCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid refund details.', { status: 422 })

  const result = await service.refunds.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'refund', ...result.data }, { status: 201 })
}
