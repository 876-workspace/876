import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingInvoiceResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { InvoiceUpdateSchema } from '@/types/invoice'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ organizationId: string; invoiceId: string }>
}

export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId, invoiceId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.invoices.read'
  )
  if (access.response) return access.response

  const invoice = await service.invoices.retrieve(access.tenant.id, invoiceId)
  if (!invoice) return apiError('Invoice not found.', { status: 404 })
  return apiSuccess(BillingInvoiceResource(invoice))
})

export const PATCH = integrationRoute<Context>(async (request, context) => {
  const { organizationId, invoiceId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.invoices.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = InvoiceUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid invoice details.', { status: 422 })

  const result = await service.invoices.update(
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
