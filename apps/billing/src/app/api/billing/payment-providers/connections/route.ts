import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PaymentProviderConnectionCreateSchema } from '@/types/payment-provider'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('payments:read')
  if (access.response) return access.response

  const rows = await service.paymentProviders.connections.list(
    access.context.tenant.id
  )
  return apiSuccess(
    List(
      '/api/v1/payment-providers/connections',
      rows as unknown as Array<Record<string, unknown>>,
      'payment_provider_connection'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('payments:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PaymentProviderConnectionCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid provider-connection details.', { status: 422 })

  const result = await service.paymentProviders.connections.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('payment_provider_connection', result.data), {
    status: 201,
  })
}
