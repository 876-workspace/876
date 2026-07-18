import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { PaymentResource } from '@/lib/api/payment-resource'
import { service } from '@/lib/service'
import { PaymentUpdateSchema } from '@/types/payment'

export const runtime = 'nodejs'

type Context = { params: Promise<{ paymentId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('payments:read')
  if (access.response) return access.response

  const { paymentId } = await context.params
  const payment = await service.payments.retrieve(
    access.context.tenant.id,
    paymentId
  )
  if (!payment) return apiError('Payment not found.', { status: 404 })

  return apiSuccess(PaymentResource(payment))
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const { paymentId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = PaymentUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid payment details and allocations.', {
      status: 422,
    })

  const result = await service.payments.update(
    access.context.tenant.id,
    paymentId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'payment', ...result.data })
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const { paymentId } = await context.params
  const result = await service.payments.delete(
    access.context.tenant.id,
    paymentId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'payment', id: paymentId, deleted: true })
}
