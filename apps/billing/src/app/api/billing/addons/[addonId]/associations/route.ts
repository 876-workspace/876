import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { AddonAssociationMutationSchema } from '@/types/addon'

export const runtime = 'nodejs'
type Context = { params: Promise<{ addonId: string }> }

export async function PUT(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { addonId } = await context.params
  const parsed = AddonAssociationMutationSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid association details.', { status: 422 })
  if ('associations' in parsed.data) {
    const result = await service.addons.associations.upsertMany(
      access.context.tenant.id,
      addonId,
      parsed.data.associations
    )
    if (result.error !== null)
      return apiError(result.error, { status: result.status ?? 500 })
    return apiSuccess({
      object: 'plan_addon_association_batch',
      id: addonId,
      updated: result.data.ids.length,
    })
  }

  const result = await service.addons.associations.upsert(
    access.context.tenant.id,
    addonId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('plan_addon_association', result.data))
}
