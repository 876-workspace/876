import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { InvoiceFinalizeSchema } from '@/types/invoice'

export const runtime = 'nodejs'

type Context = { params: Promise<{ invoiceId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { invoiceId } = await context.params
  const body = await request.json().catch(() => ({}))
  const parsed = InvoiceFinalizeSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid invoice finalization details.', {
      status: 422,
    })

  const result = await service.invoices.finalize(
    access.context.tenant.id,
    invoiceId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'invoice', id: result.data.id })
}
