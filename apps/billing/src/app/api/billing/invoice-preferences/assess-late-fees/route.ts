import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function POST() {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const result = await service.invoicePreferences.assessLateFees(
    access.context.tenant.id
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'late_fee_run', ...result.data })
}
