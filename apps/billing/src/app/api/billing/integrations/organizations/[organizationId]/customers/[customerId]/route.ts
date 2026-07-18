import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingCustomerResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { CustomerUpdateSchema } from '@/types/customer'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ organizationId: string; customerId: string }>
}

/** Retrieves one Billing customer through the organization integration scope. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId, customerId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.customers.read'
  )
  if (access.response) return access.response

  const customer = await service.customers.retrieve(
    access.tenant.id,
    customerId
  )
  if (!customer) return apiError('Customer not found.', { status: 404 })

  return apiSuccess(BillingCustomerResource(customer))
})

/** Updates one Billing customer through the organization integration scope. */
export const PATCH = integrationRoute<Context>(async (request, context) => {
  const { organizationId, customerId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.customers.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CustomerUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid customer details.', { status: 422 })

  const result = await service.customers.update(
    access.tenant.id,
    customerId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const customer = await service.customers.retrieve(
    access.tenant.id,
    customerId
  )
  if (!customer) return apiError('Customer not found.', { status: 404 })

  return apiSuccess(BillingCustomerResource(customer))
})

/** Archives one Billing customer through the organization integration scope. */
export const DELETE = integrationRoute<Context>(async (request, context) => {
  const { organizationId, customerId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.customers.write'
  )
  if (access.response) return access.response

  const result = await service.customers.update(access.tenant.id, customerId, {
    status: 'ARCHIVED',
  })
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'customer', id: customerId, deleted: true })
})
