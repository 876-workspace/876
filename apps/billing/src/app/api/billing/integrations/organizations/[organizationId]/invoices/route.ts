import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import {
  parseIntegrationCreateBody,
  requireCreateAttribution,
} from '@/lib/api/integration-idempotency'
import { BillingInvoiceResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { InvoiceCreateSchema } from '@/types/invoice'
import { z } from 'zod'

export const runtime = 'nodejs'

const StatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
  'UNCOLLECTIBLE',
  'VOID',
])

type Context = { params: Promise<{ organizationId: string }> }

/** Lists Billing invoices belonging to a core organization's workspace. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.invoices.read'
  )
  if (access.response) return access.response

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  let status: z.infer<typeof StatusSchema> | undefined = undefined
  if (statusParam) {
    const parsed = StatusSchema.safeParse(statusParam)
    if (!parsed.success) {
      return apiError('Enter a valid invoice status filter.', {
        status: 400,
      })
    }
    status = parsed.data
  }

  const invoices = await service.invoices.list(access.tenant.id, status)

  return apiSuccess({
    object: 'list',
    data: invoices.map(BillingInvoiceResource),
    has_more: false,
    total_count: invoices.length,
    url: `/api/v1/integrations/organizations/${organizationId}/invoices`,
  })
})

/** Creates a source-attributed manual invoice in the shared finance workspace. */
export const POST = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.invoices.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = parseIntegrationCreateBody(body, InvoiceCreateSchema)
  if (parsed.response) return parsed.response
  if (parsed.data.params.quoteId || parsed.data.params.estimateId)
    return apiError(
      'Integration invoices must be created from explicit customer and line details.',
      { status: 422 }
    )

  const attribution = requireCreateAttribution(
    request,
    access,
    parsed.data.params,
    parsed.data.sourceExternalReference
  )
  if (attribution.response) return attribution.response

  const result = await service.invoices.create(
    access.tenant.id,
    parsed.data.params,
    attribution.data ?? undefined
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const invoice = await service.invoices.retrieve(
    access.tenant.id,
    result.data.id
  )
  if (!invoice)
    return apiError('Invoice was created but could not be retrieved.', {
      status: 500,
    })

  return apiSuccess(BillingInvoiceResource(invoice), {
    status: result.data.replayed ? 200 : 201,
  })
})
