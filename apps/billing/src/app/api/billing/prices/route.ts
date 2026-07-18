import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PriceCreateSchema } from '@/types/price'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const prices = await service.prices.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/prices',
      prices as unknown as Array<Record<string, unknown>>,
      'price'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PriceCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid price details.', { status: 422 })

  const result = await service.prices.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('price', result.data), { status: 201 })
}
