import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import {
  parseIntegrationCreateBody,
  requireCreateAttribution,
} from '@/lib/api/integration-idempotency'
import { BillingCustomerResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { CustomerCreateSchema } from '@/types/customer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists Billing customers belonging to a core organization's workspace. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.customers.read'
  )
  if (access.response) return access.response

  const url = new URL(request.url)
  const limitValue = url.searchParams.get('limit') ?? '25'
  const limit = Number(limitValue)
  const startingAfter = url.searchParams.get('starting_after') ?? undefined
  const endingBefore = url.searchParams.get('ending_before') ?? undefined
  const userId = url.searchParams.get('user_id')?.trim() || undefined
  const coreOrganizationId =
    url.searchParams.get('organization_id')?.trim() || undefined
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    (startingAfter && endingBefore) ||
    (userId && coreOrganizationId)
  )
    return apiError('Enter valid customer pagination parameters.', {
      status: 400,
    })

  const page = await service.customers.listPage(access.tenant.id, {
    limit,
    startingAfter,
    endingBefore,
    userId,
    organizationId: coreOrganizationId,
  })
  if (!page)
    return apiError('The customer pagination cursor is invalid.', {
      status: 400,
    })

  return apiSuccess({
    object: 'list',
    data: page.customers.map(BillingCustomerResource),
    has_more: page.hasMore,
    total_count: page.totalCount,
    url: `/api/v1/integrations/organizations/${organizationId}/customers`,
  })
})

/** Creates a Billing customer in a core organization's workspace. */
export const POST = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.customers.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = parseIntegrationCreateBody(body, CustomerCreateSchema)
  if (parsed.response) return parsed.response
  if (
    !access.platformAdmin &&
    parsed.data.params.externalReference !== undefined
  )
    return apiError(
      'Use sourceExternalReference for product app customer references.',
      { status: 422 }
    )

  const attribution = requireCreateAttribution(
    request,
    access,
    parsed.data.params,
    parsed.data.sourceExternalReference
  )
  if (attribution.response) return attribution.response

  const result = await service.customers.create(
    access.tenant.id,
    parsed.data.params,
    attribution.data ?? undefined
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const customer = await service.customers.retrieve(
    access.tenant.id,
    result.data.id
  )
  if (!customer)
    return apiError('Customer was created but could not be retrieved.', {
      status: 500,
    })

  return apiSuccess(BillingCustomerResource(customer), {
    status: result.data.replayed ? 200 : 201,
  })
})
