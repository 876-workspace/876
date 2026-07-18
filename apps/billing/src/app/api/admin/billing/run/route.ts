import { requireInternalService } from '@/lib/api/admin-route'
import { apiError, apiSuccess } from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { BillingSweepSchema } from '@/types/subscription'

export const runtime = 'nodejs'

/** Runs the provider-independent recurring invoice scheduler. */
export async function POST(request: Request) {
  const access = requireInternalService(request)
  if (access.response) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = BillingSweepSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid billing-run parameters.', { status: 422 })

  const result = await service.subscriptions.processAllDue(parsed.data)

  return apiSuccess(result)
}
