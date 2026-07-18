import {
  apiError,
  apiSuccess,
  List,
  requirePermission,
} from '@/lib/api/billing-route'
import { PaymentResource } from '@/lib/api/payment-resource'
import { service } from '@/lib/service'
import { PaymentCreateSchema } from '@/types/payment'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('payments:read')
  if (access.response) return access.response

  const payments = await service.payments.list(access.context.tenant.id)
  return apiSuccess({
    ...List('/api/v1/payments', [], 'payment'),
    data: payments.map(PaymentResource),
    total_count: payments.length,
  })
}

export async function POST(request: Request) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PaymentCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid payment details and allocations.', {
      status: 422,
    })

  const result = await service.payments.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'payment', ...result.data }, { status: 201 })
}
