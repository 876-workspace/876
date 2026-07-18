import { apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingOrganizationResource } from '@/lib/api/integration-resource'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Retrieves the Billing workspace linked to a core organization. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.organizations.read'
  )
  if (access.response) return access.response

  return apiSuccess(BillingOrganizationResource(access.tenant))
})
