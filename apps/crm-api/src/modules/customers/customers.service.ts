import { create876BillingIntegrationClient } from '@876/billing/integration'

import type {
  CreateCustomerInput,
  ListCustomersFilter,
  DeleteCustomerInput,
  UpdateCustomerInput,
} from '../../types/customer.js'
import * as tenants from '../tenants/tenants.service.js'

import { crmError } from '../../http/errors.js'
import * as repository from './customers.repository.js'

/**
 * The Billing registry, reached as the CRM **product app**.
 *
 * The app API key is what makes Billing resolve `principal.appId`, which the
 * integration tier requires before it accepts a `sourceExternalReference` and
 * an idempotency key on a write. An internal key authenticates as platform
 * admin instead and is refused with "Source external references require a
 * product app credential."
 *
 * Exactly one credential may be sent — Billing rejects a request carrying both
 * as ambiguous — so the internal key is deliberately absent rather than a
 * fallback.
 */
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

export async function list(
  organizationId: string,
  filter: ListCustomersFilter = {}
) {
  const tenant = await requireTenant(organizationId)

  // Pull all customers from the shared billing registry for this org.
  // The registry is the source of truth; CRM profiles are metadata extensions.
  //
  // `customerOrganizationId` / `customerUserId` filter by the *party* a customer
  // links to, not by the tenant — the registry resolves at most one customer per
  // linked party, so these answer "is this 876 org/account a customer here?".
  const result = await finance().customers.list(organizationId, {
    limit: 100,
    ...(filter.customerOrganizationId
      ? { organizationId: filter.customerOrganizationId }
      : {}),
    ...(filter.customerUserId ? { userId: filter.customerUserId } : {}),
  })
  if (result.error) throw crmError('crm/registry-unavailable')

  const billingCustomers = result.data.data
  if (!billingCustomers.length) return { customers: [], hasMore: false }

  // Lazily create CRM profiles for any billing customers that don't have one.
  const profileByBillingId = await repository.ensureMany(
    tenant.id,
    billingCustomers.map((c) => c.id)
  )

  return {
    customers: billingCustomers.map((customer) =>
      compose(profileByBillingId.get(customer.id)!, customer)
    ),
    hasMore: result.data.has_more,
  }
}

export async function retrieve(organizationId: string, id: string) {
  const tenant = await requireTenant(organizationId)
  const profile = await repository.retrieve(tenant.id, id)
  if (!profile) return null

  const result = await finance().customers.list(organizationId, {
    ids: [profile.billingCustomerId],
    limit: 1,
  })
  if (result.error) throw crmError('crm/registry-unavailable')

  return compose(profile, result.data.data[0] ?? null)
}

export async function create(
  organizationId: string,
  input: CreateCustomerInput
) {
  const tenant = await requireTenant(organizationId)
  const key = `crm:create:${input.idempotencyKey}`
  // The party kind and the party link are independent axes; the registry owns
  // both, so CRM derives the link from whichever id the caller supplied and
  // passes it straight through rather than modelling a second customer concept.
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
  if (shared.error) throw crmError('crm/registry-unavailable')

  const profile = await repository.create({
    tenantId: tenant.id,
    billingCustomerId: shared.data.id,
    ownerId: input.ownerId ?? null,
  })

  // A newly created customer comes back as `{ object, id }`; only an
  // idempotent replay returns the whole record. Read it back so this endpoint
  // always answers with a complete customer rather than an identity-less shell
  // the caller would render as "Unknown customer".
  const created = await resolveCreated(organizationId, shared.data)

  return compose(profile, created)
}

/**
 * Normalizes Billing's two create responses into the full customer.
 *
 * A failed read-back is not a failed create — the customer and its CRM profile
 * both exist — so this degrades to `null` and lets the caller render what it
 * has rather than reporting an error for work that succeeded.
 */
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
    if (shared.error) throw crmError('crm/registry-unavailable')
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
