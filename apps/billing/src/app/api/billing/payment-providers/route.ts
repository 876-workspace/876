import { apiSuccess, List, requirePermission } from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('payments:read')
  if (access.response) return access.response

  const providers = await service.paymentProviders.listCatalog()
  return apiSuccess(
    List(
      '/api/v1/payment-providers',
      providers as unknown as Array<Record<string, unknown>>,
      'payment_provider'
    )
  )
}
