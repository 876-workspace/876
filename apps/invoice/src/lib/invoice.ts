import 'server-only'

import { getInvoiceBillingIntegration } from '@/lib/clients/billing-integration'
import { getInvoiceContext } from '@/lib/auth/context'

type BoundResource<T> = {
  [K in keyof T]: T[K] extends (
    organizationId: string,
    ...args: infer Args
  ) => infer Result
    ? (...args: Args) => Result
    : T[K]
}

/** Binds an organization-scoped integration resource to Invoice's active org. */
function bindOrganization<T extends Record<string, unknown>>(
  resource: T,
  organizationId: string
): BoundResource<T> {
  const entries = Object.entries(resource).map(([name, value]) => {
    if (typeof value !== 'function') return [name, value]

    return [
      name,
      (...args: unknown[]) =>
        Reflect.apply(value, resource, [organizationId, ...args]),
    ]
  })

  return Object.fromEntries(entries) as BoundResource<T>
}

/**
 * Builds Invoice's request-scoped server facade.
 *
 * Feature code sees Invoice resources only. The underlying Billing integration
 * client and organization-scoped service topology remain below this boundary.
 */
export async function getInvoice() {
  const context = await getInvoiceContext()
  if (!context) return null

  const finance = await getInvoiceBillingIntegration()
  const organizationId = context.orgId

  return {
    organizationId,
    role: context.role,
    bankAccounts: bindOrganization(finance.bankAccounts, organizationId),
    customers: bindOrganization(finance.customers, organizationId),
    invoices: bindOrganization(finance.invoices, organizationId),
    items: bindOrganization(finance.items, organizationId),
    paymentModes: bindOrganization(finance.paymentModes, organizationId),
    payments: bindOrganization(finance.payments, organizationId),
    quotes: bindOrganization(finance.quotes, organizationId),
  }
}

export type Invoice = NonNullable<Awaited<ReturnType<typeof getInvoice>>>
