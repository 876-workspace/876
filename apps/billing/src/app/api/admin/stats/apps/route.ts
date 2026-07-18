import { requireInternalAdmin } from '@/lib/api/admin-route'
import { apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

/** Lists per-app financial rollups for the platform Billing tenant. */
export async function GET(request: Request) {
  const access = await requireInternalAdmin(request)
  if (access.response) return access.response

  return apiSuccess({
    object: 'list',
    data: await service.stats.listAppStats(access.tenant.id),
  })
}
