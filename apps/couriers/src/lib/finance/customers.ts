import 'server-only'

import type {
  BillingCustomer,
  BillingCustomerCreated,
  BillingIntegrationClient,
  IntegrationError,
  IntegrationResult,
} from '@876/billing/integration'

type CoreUserSnapshot = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
}

type CustomerLookupResult =
  | { data: BillingCustomer; error: null }
  | { data: null; error: IntegrationError | null }

/**
 * Resolves one Core user to the workspace's single shared Billing customer.
 *
 * A customer created by Billing or another product is reused. Creation is only
 * attempted when the core identity is absent; a post-conflict lookup closes
 * the concurrent first-use race without matching on mutable email or name.
 */
export async function ensureSharedCoreUserCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  user: CoreUserSnapshot
): Promise<IntegrationResult<BillingCustomer | BillingCustomerCreated>> {
  const existing = await findCoreUserCustomer(finance, organizationId, user.id)
  if (existing.error) return { data: null, error: existing.error }
  if (existing.data) return { data: existing.data, error: null }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    user.id
  const created = await finance.customers.create(
    organizationId,
    {
      customerType: 'CORE_USER',
      customerKind: 'INDIVIDUAL',
      userId: user.id,
      name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      sourceExternalReference: `couriers:core-user:${user.id}`,
    },
    { idempotencyKey: `couriers:core-user:${user.id}` }
  )
  if (!created.error) return created

  const raceWinner = await findCoreUserCustomer(
    finance,
    organizationId,
    user.id
  )
  return raceWinner.data ? raceWinner : created
}

type CustomerKind = 'INDIVIDUAL' | 'BUSINESS'

type CustomerNameParts = {
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
}

/**
 * Derives the registry's single display name from the party's parts.
 *
 * A business is named by its company and a person by their given names, but each
 * falls back to the other so a customer is never written with a blank name.
 */
function resolveCustomerName(
  customerKind: CustomerKind,
  parts: CustomerNameParts
): string {
  const person = [parts.firstName, parts.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  const company = parts.companyName?.trim() ?? ''

  return customerKind === 'BUSINESS' ? company || person : person || company
}

export async function createExternalCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  params: {
    idempotencyKey: string
    customerKind: CustomerKind
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
  }
): Promise<IntegrationResult<BillingCustomerCreated>> {
  const name = resolveCustomerName(params.customerKind, params)
  const key = `couriers:create:${params.idempotencyKey}`

  return finance.customers.create(
    organizationId,
    {
      customerType: 'EXTERNAL',
      customerKind: params.customerKind,
      name,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      companyName: params.companyName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      sourceExternalReference: key,
    },
    { idempotencyKey: key }
  )
}

export async function updateExternalCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  customerId: string,
  params: {
    customerKind: CustomerKind
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
  }
): Promise<IntegrationResult<BillingCustomer>> {
  const { customerKind, ...fields } = params

  // The registry's single display name is derived, never sent by the caller, so
  // renaming a person can't leave `name` showing the old spelling. An empty
  // derivation is dropped rather than blanking the name the registry already has.
  const name = resolveCustomerName(customerKind, fields)

  return finance.customers.update(organizationId, customerId, {
    ...fields,
    ...(name ? { name } : {}),
  })
}

async function findCoreUserCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  userId: string
): Promise<CustomerLookupResult> {
  const result = await finance.customers.list(organizationId, {
    limit: 2,
    userId,
  })
  if (result.error) return result
  if (result.data.data.length > 1)
    return {
      data: null,
      error: {
        code: 'couriers/ambiguous-billing-customer',
        message: 'Multiple Billing customers reference the same 876 user.',
      },
    }

  return { data: result.data.data[0] ?? null, error: null }
}
