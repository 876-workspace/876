import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { TaxRateUpdateSchema } from '@/types/tax'

export const runtime = 'nodejs'

type Context = { params: Promise<{ taxRateId: string }> }

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('taxes:write')
  if (access.response) return access.response

  const { taxRateId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = TaxRateUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid tax rate status.', { status: 422 })

  const result = await service.taxRates.update(
    access.context.tenant.id,
    taxRateId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tax_rate', result.data))
}
