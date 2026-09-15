'use client'

import { accountingProviders } from './accounting-providers'
import { addons } from './addons'
import { auth } from './auth'
import { bankAccounts } from './bank-accounts'
import { bankDirectory } from './bank-directory'
import {
  bankReconciliations,
  bankDeposits,
  bankRules,
  bankStatementImports,
  bankStatementLines,
} from './banking-engine'
import { bankTransactions } from './bank-transactions'
import { branding } from './branding'
import { creditNotes } from './credit-notes'
import { currencies } from './currencies'
import { customers } from './customers'
import { discounts } from './discounts'
import { documentTemplates } from './document-templates'
import { invoices } from './invoices'
import { invoicePreferences } from './invoice-preferences'
import { items } from './items'
import { invites } from './invites'
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
import { recurringInvoices } from './recurring-invoices'
import { refunds } from './refunds'
import { reportPreferences } from './report-preferences'
import { roles } from './roles'
import { salesReceipts } from './sales-receipts'
import { salesOrders } from './sales-orders'
import { subscriptions } from './subscriptions'
import { salespeople } from './salespeople'
import { support } from './support'
import { taxAuthorities } from './tax-authorities'
import { taxRates } from './tax-rates'

export const client = {
  accountingProviders,
  addons,
  auth,
  bankAccounts,
  bankDirectory,
  bankReconciliations,
  bankDeposits,
  bankRules,
  bankStatementImports,
  bankStatementLines,
  bankTransactions,
  branding,
  creditNotes,
  currencies,
  customers,
  discounts,
  documentTemplates,
  invoices,
  invoicePreferences,
  items,
  invites,
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
  recurringInvoices,
  refunds,
  reportPreferences,
  roles,
  salesReceipts,
  salesOrders,
  salespeople,
  subscriptions,
  support,
  taxAuthorities,
  taxRates,
}

export type { ClientResult } from '@/types/api'
