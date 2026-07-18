import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { TaxRateCreateSchema } from '@/types/tax'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('taxes:read')
  if (access.response) return access.response

  const rates = await service.taxRates.list(access.context.tenant.id)
  const resources = rates.map(({ taxAuthority, ...rate }) => ({
    ...rate,
    taxAuthority: Resource(
      'tax_authority',
      taxAuthority as unknown as Record<string, unknown>
    ),
  }))
  return apiSuccess(
    List(
      '/api/v1/tax-rates',
      resources as unknown as Array<Record<string, unknown>>,
      'tax_rate'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('taxes:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = TaxRateCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid tax rate details.', { status: 422 })

  const result = await service.taxRates.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tax_rate', result.data), { status: 201 })
}
