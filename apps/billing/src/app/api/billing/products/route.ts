import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { ProductCreateSchema } from '@/types/product'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const products = await service.products.list(access.context.tenant.id)
  return apiSuccess(
    List(
      '/api/v1/products',
      products as unknown as Array<Record<string, unknown>>,
      'product'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = ProductCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid product details.', { status: 422 })

  const result = await service.products.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('product', result.data), { status: 201 })
}
