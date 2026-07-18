import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { InvoicePreferenceUpdateSchema } from '@/types/invoice-preference'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const preference = await service.invoicePreferences.retrieve(
    access.context.tenant.id
  )
  if (!preference)
    return apiError('Invoice preferences were not found.', { status: 404 })

  return apiSuccess(Resource('invoice_preference', preference))
}

export async function PATCH(request: Request) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = InvoicePreferenceUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError(
      parsed.error.issues[0]?.message ?? 'Enter valid invoice preferences.',
      { status: 422 }
    )

  const result = await service.invoicePreferences.update(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('invoice_preference', result.data))
}
