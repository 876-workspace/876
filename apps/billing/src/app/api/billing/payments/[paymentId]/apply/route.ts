import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PaymentApplySchema } from '@/types/payment'

export const runtime = 'nodejs'

type Context = { params: Promise<{ paymentId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const { paymentId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = PaymentApplySchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid payment allocations.', { status: 422 })

  const result = await service.payments.apply(
    access.context.tenant.id,
    paymentId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'payment', id: result.data.id })
}
