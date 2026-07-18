import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { AddonCreateSchema } from '@/types/addon'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const productId = url.searchParams.get('product_id') ?? undefined
  const isActive =
    status === 'active' ? true : status === 'archived' ? false : undefined
  const addons = await service.addons.list(
    access.context.tenant.id,
    isActive,
    productId
  )
  return apiSuccess(
    List(
      '/api/v1/addons',
      addons as unknown as Array<Record<string, unknown>>,
      'addon'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const parsed = AddonCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid add-on details.', { status: 422 })
  const result = await service.addons.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('addon', result.data), { status: 201 })
}
