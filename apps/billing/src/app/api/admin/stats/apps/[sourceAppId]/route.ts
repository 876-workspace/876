import { requireInternalAdmin } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ sourceAppId: string }> }

/** Retrieves one app's financial and per-plan Billing rollups. */
export async function GET(request: Request, context: Context) {
  const access = await requireInternalAdmin(request)
  if (access.response) return access.response

  const { sourceAppId } = await context.params
  if (sourceAppId.trim().length === 0 || sourceAppId.length > 80)
    return apiError('Enter a valid app id.', { status: 400 })

  const result = await service.stats.retrieveAppStats(
    access.tenant.id,
    sourceAppId
  )
  if (!result) return apiError('App billing stats not found.', { status: 404 })

  return apiSuccess(result)
}
