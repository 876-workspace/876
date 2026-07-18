import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingPlanResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists Billing plans belonging to a core organization's workspace. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.plans.read'
  )
  if (access.response) return access.response

  const url = new URL(request.url)
  const isActiveParam = url.searchParams.get('is_active')
  const productId = url.searchParams.get('product_id') ?? undefined

  let isActive: boolean | undefined = undefined
  if (isActiveParam === 'true') isActive = true
  else if (isActiveParam === 'false') isActive = false

  const plans = await service.plans.list(access.tenant.id, isActive, productId)

  return apiSuccess({
    object: 'list',
    data: plans.map(BillingPlanResource),
    has_more: false,
    total_count: plans.length,
    url: `/api/v1/integrations/organizations/${organizationId}/plans`,
  })
})
