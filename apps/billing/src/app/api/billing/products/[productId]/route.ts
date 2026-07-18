import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { ProductUpdateSchema } from '@/types/product'

export const runtime = 'nodejs'

type Context = { params: Promise<{ productId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const { productId } = await context.params
  const row = await service.products.retrieve(
    access.context.tenant.id,
    productId
  )
  if (!row) return apiError('Product not found.', { status: 404 })

  return apiSuccess(
    Resource('product', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { productId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = ProductUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid product details.', { status: 422 })

  const result = await service.products.update(
    access.context.tenant.id,
    productId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('product', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { productId } = await context.params
  const result = await service.products.delete(
    access.context.tenant.id,
    productId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'product', id: productId, deleted: true })
}
