import { create876BillingIntegrationClient } from '@876/billing/integration'
import { getError, isError } from '@876/core'

import type {
  CreateCustomerInput,
  DeleteCustomerInput,
  ListCustomersFilter,
  UpdateCustomerInput,
} from '../../types/customer.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './customers.repository.js'

function finance() {
  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.CRM_API_876_KEY,
  })
}

type FinanceCustomer = NonNullable<
  Awaited<ReturnType<ReturnType<typeof finance>['customers']['list']>>['data']
>['data'][number]

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('crm/tenant-inactive')
  return tenant
}

function resolveName(params: {
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}) {
  const person = [params.firstName, params.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ')
  const company = params.companyName?.trim() ?? ''

  return params.customerKind === 'BUSINESS'
    ? company || person
    : person || company
}

function serializeProfile(
  profile: Awaited<ReturnType<typeof repository.retrieve>> & {}
) {
  if (!profile) return null

  return {
    ...profile,
    createdAt: Math.floor(profile.createdAt.getTime() / 1000),
    updatedAt: Math.floor(profile.updatedAt.getTime() / 1000),
    deletedAt: profile.deletedAt
      ? Math.floor(profile.deletedAt.getTime() / 1000)
      : null,
  }
}

function compose(
  profile: NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>,
  customer: FinanceCustomer | null
) {
  return {
    object: 'customer_profile' as const,
    profile: serializeProfile(profile)!,
    customer,
  }
}

export async function list(
  organizationId: string,
  filter: ListCustomersFilter = {}
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant

  const result = await finance().customers.list(organizationId, {
    limit: 100,
    ...(filter.billingCustomerId ? { ids: [filter.billingCustomerId] } : {}),
    ...(filter.customerOrganizationId
      ? { organizationId: filter.customerOrganizationId }
      : {}),
    ...(filter.customerUserId ? { userId: filter.customerUserId } : {}),
  })
  if (result.error) return getError('crm/registry-unavailable')

  const billingCustomers = result.data.data
  if (!billingCustomers.length) return { customers: [], hasMore: false }

  const profileByBillingId = await repository.ensureMany(
    tenant.id,
    billingCustomers.map((customer) => customer.id)
  )

  return {
    customers: billingCustomers.map((customer) =>
      compose(profileByBillingId.get(customer.id)!, customer)
    ),
    hasMore: result.data.has_more,
  }
}

/**
 * Resolves the CRM profile for one registry customer through the same registry
 * lookup and ensure-many path used by the billingCustomerId list filter.
 */
export async function resolveForBillingCustomer(
  organizationId: string,
  billingCustomerId: string
) {
  const result = await list(organizationId, { billingCustomerId })
  if (isError(result)) return result
  return result.customers[0]?.profile ?? null
}

export async function retrieve(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const profile = await repository.retrieve(tenant.id, id)
  if (!profile) return null

  const result = await finance().customers.list(organizationId, {
    ids: [profile.billingCustomerId],
    limit: 1,
  })
  if (result.error) return getError('crm/registry-unavailable')

  return compose(profile, result.data.data[0] ?? null)
}

export async function create(
  organizationId: string,
  input: CreateCustomerInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const key = `crm:create:${input.idempotencyKey}`
  const customerType = input.userId
    ? ('CORE_USER' as const)
    : input.organizationId
      ? ('CORE_ORGANIZATION' as const)
      : ('EXTERNAL' as const)

  const shared = await finance().customers.create(
    organizationId,
    {
      customerType,
      userId: input.userId ?? null,
      organizationId: input.organizationId ?? null,
      customerKind: input.customerKind,
      name: resolveName(input),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      companyName: input.companyName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      sourceExternalReference: key,
    },
    { idempotencyKey: key }
  )
  if (shared.error) return getError('crm/registry-unavailable')

  const profile = await repository.create({
    tenantId: tenant.id,
    billingCustomerId: shared.data.id,
    ownerId: input.ownerId ?? null,
  })
  const created = await resolveCreated(organizationId, shared.data)
  return compose(profile, created)
}

async function resolveCreated(
  organizationId: string,
  created: { id: string } | FinanceCustomer
): Promise<FinanceCustomer | null> {
  if ('customerType' in created) return created
  const result = await finance().customers.retrieve(organizationId, created.id)
  return result.data ?? null
}

export async function update(
  organizationId: string,
  id: string,
  input: UpdateCustomerInput
) {
  const current = await retrieve(organizationId, id)
  if (!current || isError(current)) return current

  let customer = current.customer
  if (customer?.customerType === 'EXTERNAL') {
    const shared = await finance().customers.update(
      organizationId,
      current.profile.billingCustomerId,
      {
        name: resolveName(input),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        companyName: input.companyName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
      }
    )
    if (shared.error) return getError('crm/registry-unavailable')
    customer = shared.data
  }

  const profile = await repository.update(current.profile.id, {
    ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
    ...(input.status ? { status: input.status } : {}),
  })

  return compose(profile, customer)
}

export async function remove(
  organizationId: string,
  id: string,
  params: DeleteCustomerInput
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, id)
  if (!current) return null
  return repository.remove({ id: current.id, ...params })
}
