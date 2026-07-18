import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PriceListCreateSchema } from '@/types/price-list'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response
  const status = new URL(request.url).searchParams.get('status')
  const isActive =
    status === 'active' ? true : status === 'archived' ? false : undefined
  const lists = await service.priceLists.list(
    access.context.tenant.id,
    isActive
  )
  return apiSuccess(
    List(
      '/api/v1/price-lists',
      lists as unknown as Array<Record<string, unknown>>,
      'price_list'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const parsed = PriceListCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid price-list details.', { status: 422 })
  const result = await service.priceLists.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('price_list', result.data), { status: 201 })
}
