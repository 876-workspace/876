import { nowUnixSeconds } from '@/platform/timestamps'

import {
  customerLifetimeSales,
  customerSubscriptionSnapshot,
} from '@/modules/reporting'

import { buildCustomerAccountProjection } from './customer-account.projection'
import {
  customerOverdueReceivable,
  listCustomerAccountLedgerRows,
  summarizeCustomerAccountLedger,
} from './customer-account.repository'
import { retrieveCustomer } from './customers.service'
import { serializeLedgerEntry } from './customers.serializers'

export async function customerAccount(tenantId: string, customerId: string) {
  const [customer, entries, summaries, overdueReceivable, lifetime, snapshot] =
    await Promise.all([
      retrieveCustomer(tenantId, customerId),
      listCustomerAccountLedgerRows(tenantId, customerId),
      summarizeCustomerAccountLedger(tenantId, customerId),
      customerOverdueReceivable(tenantId, customerId, nowUnixSeconds()),
      customerLifetimeSales(tenantId, customerId),
      customerSubscriptionSnapshot(tenantId, customerId),
    ])

  const accountCurrency = customer.defaultCurrency?.toUpperCase() ?? null

  return buildCustomerAccountProjection(
    customer,
    entries.map(serializeLedgerEntry),
    summaries,
    overdueReceivable,
    {
      // Lifetime sales are reported in the account's own currency; other
      // currencies are never folded into the same figure.
      lifetimeSales:
        (accountCurrency && lifetime.salesByCurrency.get(accountCurrency)) ||
        '0',
      lifetimeCredits:
        (accountCurrency && lifetime.creditsByCurrency.get(accountCurrency)) ||
        '0',
      lastSaleAt: lifetime.lastSaleAt,
      activeSubscriptionCount: snapshot.activeSubscriptionCount,
      subscriptionMrr: snapshot.mrr,
    }
  )
}
