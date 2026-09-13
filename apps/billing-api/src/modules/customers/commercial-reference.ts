import { findCustomerRow } from './customers.repository'

export interface CommercialCustomerReference {
  id: string
  defaultCurrency: string | null
  priceListId: string | null
}

/**
 * Resolves the active customer facts commercial workflows are allowed to use.
 * Customer persistence remains owned by the Customers module.
 */
export async function resolveCommercialCustomer(
  tenantId: string,
  customerId: string
): Promise<CommercialCustomerReference | null> {
  const customer = await findCustomerRow(tenantId, customerId)
  if (!customer || customer.status !== 'ACTIVE') return null

  return {
    id: customer.id,
    defaultCurrency: customer.defaultCurrency,
    priceListId: customer.priceListId,
  }
}
