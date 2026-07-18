import {
  apiError,
  apiSuccess,
  Resource,
  TenantResource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PaymentModeUpdateSchema } from '@/types/payment'

export const runtime = 'nodejs'

type Context = { params: Promise<{ modeId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('payments:read')
  if (access.response) return access.response

  const { modeId } = await context.params
  const mode = await service.paymentModes.retrieve(
    access.context.tenant.id,
    modeId
  )
  if (!mode) return apiError('Payment mode not found.', { status: 404 })

  return apiSuccess(TenantResource('payment_mode', mode))
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const { modeId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = PaymentModeUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid payment mode details.', { status: 422 })

  const result = await service.paymentModes.update(
    access.context.tenant.id,
    modeId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('payment_mode', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const { modeId } = await context.params
  const result = await service.paymentModes.delete(
    access.context.tenant.id,
    modeId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'payment_mode', id: modeId, deleted: true })
}
