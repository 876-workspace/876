import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import {
  TenantCurrencyEnableSchema,
  CurrencyCreateSchema,
} from '@/types/currency'
export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('currencies:read')
  if (access.response) return access.response

  const currencies = await service.currencies.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/currencies',
      currencies as unknown as Array<Record<string, unknown>>,
      'currency'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('currencies:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CurrencyCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid currency details.', { status: 422 })

  const result = await service.currencies.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tenant_currency', result.data), {
    status: 201,
  })
}

export async function PATCH(request: Request) {
  const access = await requirePermission('currencies:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = TenantCurrencyEnableSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter a valid currency code.', { status: 422 })

  const result = await service.currencies.setDefault(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tenant_currency', result.data))
}
