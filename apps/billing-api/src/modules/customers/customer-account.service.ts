import { nowUnixSeconds } from '@/platform/timestamps'

import { buildCustomerAccountProjection } from './customer-account.projection'
import {
  customerOverdueReceivable,
  listCustomerAccountLedgerRows,
  summarizeCustomerAccountLedger,
} from './customer-account.repository'
import { retrieveCustomer } from './customers.service'
import { serializeLedgerEntry } from './customers.serializers'

export async function customerAccount(tenantId: string, customerId: string) {
  const [customer, entries, summaries, overdueReceivable] = await Promise.all([
    retrieveCustomer(tenantId, customerId),
    listCustomerAccountLedgerRows(tenantId, customerId),
    summarizeCustomerAccountLedger(tenantId, customerId),
    customerOverdueReceivable(tenantId, customerId, nowUnixSeconds()),
  ])

  return buildCustomerAccountProjection(
    customer,
    entries.map(serializeLedgerEntry),
    summaries,
    overdueReceivable
  )
}
