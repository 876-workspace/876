import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PaymentProviderConnectionUpdateSchema } from '@/types/payment-provider'

export const runtime = 'nodejs'

type Context = { params: Promise<{ connectionId: string }> }

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const { connectionId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = PaymentProviderConnectionUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid provider-connection details.', { status: 422 })

  const result = await service.paymentProviders.connections.update(
    access.context.tenant.id,
    connectionId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('payment_provider_connection', result.data))
}
