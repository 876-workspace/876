'use client'

import { bankAccounts } from './bank-accounts'
import { addons } from './addons'
import { auth } from './auth'
import { bankTransactions } from './bank-transactions'
import { creditNotes } from './credit-notes'
import { currencies } from './currencies'
import { customers } from './customers'
import { invoices } from './invoices'
import { invoicePreferences } from './invoice-preferences'
import { items } from './items'
import { members } from './members'
import { paymentModes } from './payment-modes'
import { paymentProviders } from './payment-providers'
import { paymentTerms } from './payment-terms'
import { payments } from './payments'
import { plans } from './plans'
import { prices } from './prices'
import { priceLists } from './price-lists'
import { products } from './products'
import { quotes } from './quotes'
import { refunds } from './refunds'
import { roles } from './roles'
import { subscriptions } from './subscriptions'
import { salespeople } from './salespeople'
import { discounts } from './discounts'
import { taxAuthorities } from './tax-authorities'
import { taxRates } from './tax-rates'

export const client = {
  addons,
  auth,
  bankAccounts,
  bankTransactions,
  creditNotes,
  currencies,
  customers,
  discounts,
  invoices,
  invoicePreferences,
  items,
  members,
  paymentModes,
  paymentProviders,
  paymentTerms,
  payments,
  plans,
  prices,
  priceLists,
  products,
  quotes,
  refunds,
  roles,
  salespeople,
  subscriptions,
  taxAuthorities,
  taxRates,
}

export type { ClientResult } from '@/types/api'
