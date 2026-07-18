import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { VendorUpdateSchema } from '@/types/vendor'

export const runtime = 'nodejs'

type Context = { params: Promise<{ vendorId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('vendors:read')
  if (access.response) return access.response

  const { vendorId } = await context.params
  const row = await service.vendors.retrieve(access.context.tenant.id, vendorId)
  if (!row) return apiError('Vendor not found.', { status: 404 })

  return apiSuccess(
    Resource('vendor', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('vendors:write')
  if (access.response) return access.response

  const { vendorId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = VendorUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid vendor details.', { status: 422 })

  const result = await service.vendors.update(
    access.context.tenant.id,
    vendorId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('vendor', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('vendors:write')
  if (access.response) return access.response

  const { vendorId } = await context.params
  const result = await service.vendors.delete(
    access.context.tenant.id,
    vendorId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'vendor', id: vendorId, deleted: true })
}
