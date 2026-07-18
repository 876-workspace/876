import 'server-only'

import { bankAccounts } from './bank-accounts'
import { addons } from './addons'
import { bankTransactions } from './bank-transactions'
import { creditNotes } from './credit-notes'
import { currencies } from './currencies'
import { customers } from './customers'
import { discounts } from './discounts'
import { dashboard } from './dashboard'
import { estimates } from './estimates'
import { financeConnections } from './finance-connections'
import { invoices } from './invoices'
import { invoicePreferences } from './invoice-preferences'
import { items } from './items'
import { members } from './members'
import { paymentModes } from './payment-modes'
import { payments } from './payments'
import { paymentProviders } from './payment-providers'
import { paymentTerms } from './payment-terms/service'
import { plans } from './plans'
import { prices } from './prices'
import { priceLists } from './price-lists'
import { products } from './products'
import { quotes } from './quotes'
import { refunds } from './refunds'
import { roles } from './roles'
import { salespeople } from './salespeople'
import { subscriptions } from './subscriptions'
import { stats } from './stats'
import { taxAuthorities } from './tax-authorities'
import { taxRates } from './tax-rates'
import { tenants } from './tenants'
import { vendors } from './vendors'

/** The only Billing-local layer allowed to access Prisma directly. */
export const service = {
  addons,
  bankAccounts,
  bankTransactions,
  creditNotes,
  currencies,
  customers,
  discounts,
  dashboard,
  invoices,
  invoicePreferences,
  estimates,
  financeConnections,
  items,
  members,
  paymentModes,
  payments,
  paymentProviders,
  paymentTerms,
  plans,
  prices,
  priceLists,
  products,
  quotes,
  refunds,
  roles,
  salespeople,
  stats,
  subscriptions,
  taxAuthorities,
  taxRates,
  tenants,
  vendors,
}
