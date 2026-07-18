import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { InvoiceUpdateSchema } from '@/types/invoice'

export const runtime = 'nodejs'

type Context = { params: Promise<{ invoiceId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('sales:read')
  if (access.response) return access.response

  const { invoiceId } = await context.params
  const row = await service.invoices.retrieve(
    access.context.tenant.id,
    invoiceId
  )
  if (!row) return apiError('Invoice not found.', { status: 404 })

  return apiSuccess(
    Resource('invoice', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { invoiceId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = InvoiceUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid invoice details.', { status: 422 })

  const result = await service.invoices.update(
    access.context.tenant.id,
    invoiceId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('invoice', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('sales:write')
  if (access.response) return access.response

  const { invoiceId } = await context.params
  const result = await service.invoices.delete(
    access.context.tenant.id,
    invoiceId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'invoice', id: invoiceId, deleted: true })
}
