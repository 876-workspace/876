import { create876BillingIntegrationClient } from '@876/billing/integration'

import type {
  CreateCustomerInput,
  DeleteCustomerInput,
  UpdateCustomerInput,
} from '../../types/customer.js'
import * as tenants from '../tenants/tenants.service.js'

import { crmError } from '../../http/errors.js'
import * as repository from './customers.repository.js'

function finance() {
  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.CRM_API_876_KEY,
  })
}

/**
 * The registry customer as the Billing integration client actually returns it.
 * Derived from the client so the two cannot drift.
 */
type FinanceCustomer = NonNullable<
  Awaited<ReturnType<ReturnType<typeof finance>['customers']['list']>>['data']
>['data'][number]

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) throw crmError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') throw crmError('crm/tenant-inactive')
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

export async function list(organizationId: string) {
  const tenant = await requireTenant(organizationId)
  const profiles = await repository.list(tenant.id)
  if (!profiles.length) return []

  const result = await finance().customers.list(organizationId, {
    ids: profiles.map((profile) => profile.billingCustomerId),
    limit: Math.min(profiles.length, 100),
  })
  if (result.error)
    throw crmError('crm/registry-unavailable', result.error.message)

  const byId = new Map(
    result.data.data.map((customer) => [customer.id, customer])
  )

  return profiles.map((profile) =>
    compose(profile, byId.get(profile.billingCustomerId) ?? null)
  )
}

export async function retrieve(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  const profile = await repository.retrieve(tenant.id, id)
  if (!profile) return null

  const result = await finance().customers.list(organizationId, {
    ids: [profile.billingCustomerId],
    limit: 1,
  })
  if (result.error)
    throw crmError('crm/registry-unavailable', result.error.message)

  return compose(profile, result.data.data[0] ?? null)
}

export async function create(
  organizationId: string,
  input: CreateCustomerInput
) {
  const tenant = await requireTenant(organizationId)
  const key = `crm:create:${input.idempotencyKey}`
  const shared = await finance().customers.create(
    organizationId,
    {
      customerType: 'EXTERNAL',
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
  if (shared.error)
    throw crmError('crm/registry-unavailable', shared.error.message)

  const profile = await repository.create({
    tenantId: tenant.id,
    billingCustomerId: shared.data.id,
    ownerId: input.ownerId ?? null,
  })

  return compose(profile, shared.data)
}

export async function update(
  organizationId: string,
  id: string,
  input: UpdateCustomerInput
) {
  const current = await retrieve(organizationId, id)
  if (!current) return null

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
    if (shared.error)
      throw crmError('crm/registry-unavailable', shared.error.message)
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
  const current = await repository.retrieve(tenant.id, id)
  if (!current) return null

  return repository.remove({ id: current.id, ...params })
}
