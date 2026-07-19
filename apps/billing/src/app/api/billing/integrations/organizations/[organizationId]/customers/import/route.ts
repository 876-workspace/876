import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { requireCreateAttribution } from '@/lib/api/integration-idempotency'
import { service } from '@/lib/service'
import { CustomerImportSchema } from '@/types/customer'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/**
 * Imports external customers into one Billing workspace.
 *
 * Customer fields are updated for matched rows in `update` mode. Existing
 * contacts and addresses are intentionally left unchanged in import v1.
 */
export const POST = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.customers.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CustomerImportSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid customer import details.', { status: 400 })

  const attributionResult = parsed.data.dryRun
    ? { data: null, response: null }
    : requireCreateAttribution(request, access, parsed.data, null)
  if (attributionResult.response) return attributionResult.response

  const attribution = attributionResult.data
    ? {
        sourceAppId: attributionResult.data.sourceAppId,
        idempotencyKey: attributionResult.data.sourceIdempotencyKey,
      }
    : undefined

  const result = await service.customers.import(
    access.tenant.id,
    parsed.data,
    attribution
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(result.data)
})
