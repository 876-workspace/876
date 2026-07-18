import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  parseIntegrationCreateBody,
  requireCreateAttribution,
} from '@/lib/api/integration-idempotency'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingItemResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { ItemCreateSchema } from '@/types/item'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists the shared finance catalog available to a connected product app. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.items.read'
  )
  if (access.response) return access.response

  const url = new URL(request.url)
  const active = url.searchParams.get('active')
  if (active !== null && active !== 'true' && active !== 'false')
    return apiError('Enter a valid active item filter.', { status: 400 })

  const items = await service.items.list(
    access.tenant.id,
    active === null ? undefined : active === 'true'
  )
  return apiSuccess({
    object: 'list',
    data: items.map(BillingItemResource),
    has_more: false,
    total_count: items.length,
    url: `/api/v1/integrations/organizations/${organizationId}/items`,
  })
})

/** Creates a source-attributed item in the shared finance catalog. */
export const POST = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.items.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = parseIntegrationCreateBody(body, ItemCreateSchema)
  if (parsed.response) return parsed.response
  const attribution = requireCreateAttribution(
    request,
    access,
    parsed.data.params,
    parsed.data.sourceExternalReference
  )
  if (attribution.response) return attribution.response

  const result = await service.items.create(
    access.tenant.id,
    parsed.data.params,
    attribution.data ?? undefined
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const item = await service.items.retrieve(access.tenant.id, result.data.id)
  if (!item)
    return apiError('Item was created but could not be retrieved.', {
      status: 500,
    })

  return apiSuccess(BillingItemResource(item), {
    status: result.data.replayed ? 200 : 201,
  })
})
