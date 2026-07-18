import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { AddonUpdateSchema } from '@/types/addon'

export const runtime = 'nodejs'
type Context = { params: Promise<{ addonId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response
  const { addonId } = await context.params
  const addon = await service.addons.retrieve(access.context.tenant.id, addonId)
  if (!addon) return apiError('Add-on not found.', { status: 404 })
  return apiSuccess(
    Resource('addon', addon as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { addonId } = await context.params
  const parsed = AddonUpdateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid add-on details.', { status: 422 })
  const result = await service.addons.update(
    access.context.tenant.id,
    addonId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('addon', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { addonId } = await context.params
  const result = await service.addons.delete(access.context.tenant.id, addonId)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess({ object: 'addon', id: addonId, deleted: true })
}
