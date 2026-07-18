import {
  apiError,
  apiSuccess,
  requirePermission,
  Resource,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CurrencyUpdateSchema } from '@/types/currency'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const access = await requirePermission('currencies:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CurrencyUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid currency details.', { status: 422 })

  const result = await service.currencies.update(
    access.context.tenant.id,
    code,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tenant_currency', result.data))
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const access = await requirePermission('currencies:write')
  if (access.response) return access.response

  const result = await service.currencies.remove(access.context.tenant.id, code)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('tenant_currency', { currency: code }))
}
