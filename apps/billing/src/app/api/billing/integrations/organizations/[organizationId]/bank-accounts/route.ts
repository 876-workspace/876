import { apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingBankAccountResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists deposit-account choices without exposing balances to product apps. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.payments.read'
  )
  if (access.response) return access.response

  const accounts = (await service.bankAccounts.list(access.tenant.id)).filter(
    (account) => account.isActive
  )
  return apiSuccess({
    object: 'list',
    data: accounts.map(BillingBankAccountResource),
    has_more: false,
    total_count: accounts.length,
    url: `/api/v1/integrations/organizations/${organizationId}/bank-accounts`,
  })
})
