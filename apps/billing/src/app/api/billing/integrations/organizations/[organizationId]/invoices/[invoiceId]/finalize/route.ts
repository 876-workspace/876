import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingInvoiceResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { InvoiceFinalizeSchema } from '@/types/invoice'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ organizationId: string; invoiceId: string }>
}

export const POST = integrationRoute<Context>(async (request, context) => {
  const { organizationId, invoiceId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.invoices.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = InvoiceFinalizeSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid invoice finalization details.', {
      status: 422,
    })

  const result = await service.invoices.finalize(
    access.tenant.id,
    invoiceId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const invoice = await service.invoices.retrieve(access.tenant.id, invoiceId)
  if (!invoice) return apiError('Invoice not found.', { status: 404 })
  return apiSuccess(BillingInvoiceResource(invoice))
})
