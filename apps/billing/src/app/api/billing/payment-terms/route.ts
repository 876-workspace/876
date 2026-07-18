import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PaymentTermCreateSchema } from '@/types/payment-term'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const terms = await service.paymentTerms.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/payment-terms',
      terms as unknown as Array<Record<string, unknown>>,
      'payment_term'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PaymentTermCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid payment-term details.', { status: 422 })

  const result = await service.paymentTerms.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('payment_term', result.data), { status: 201 })
}
