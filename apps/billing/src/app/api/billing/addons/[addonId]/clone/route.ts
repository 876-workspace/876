import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { AddonCloneSchema } from '@/types/addon'

export const runtime = 'nodejs'
type Context = { params: Promise<{ addonId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { addonId } = await context.params
  const parsed = AddonCloneSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter a unique add-on code and name.', { status: 422 })
  const result = await service.addons.clone(
    access.context.tenant.id,
    addonId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('addon', result.data))
}
