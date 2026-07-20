import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CustomerImportRequestSchema } from '@/types/customer-import'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const access = await requirePermission('customers:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CustomerImportRequestSchema.safeParse(body)
  if (!parsed.success)
    return apiError(
      parsed.error.issues[0]?.message ?? 'Enter valid import rows.',
      {
        status: 422,
      }
    )

  const result = await service.customers.import(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(result.data)
}
