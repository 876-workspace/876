import 'server-only'

import type {
  BillingCustomer,
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
): Promise<IntegrationResult<BillingCustomer>> {
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

async function findCoreUserCustomer(
  finance: BillingIntegrationClient,
  organizationId: string,
  userId: string
): Promise<CustomerLookupResult> {
  const result = await finance.customers.list(organizationId, {
    limit: 2,
    user_id: userId,
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
