import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PaymentModeCreateSchema } from '@/types/payment'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('payments:read')
  if (access.response) return access.response

  const modes = await service.paymentModes.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/payments/modes',
      modes.map(({ tenantId: _tenantId, ...mode }) => mode),
      'payment_mode'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PaymentModeCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid payment mode details.', { status: 422 })

  const result = await service.paymentModes.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('payment_mode', result.data), { status: 201 })
}
