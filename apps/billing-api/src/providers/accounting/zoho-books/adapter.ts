import type { AccountingProviderAdapter } from '../types'
import {
  zohoCustomers,
  zohoEstimates,
  zohoInvoices,
  zohoItems,
  zohoPayments,
  zohoRecurringInvoices,
} from './resources'

export const zohoBooksAdapter = {
  key: 'zoho-books',
  capabilities: {
    customers: true,
    items: true,
    estimates: true,
    invoices: true,
    recurringInvoices: true,
    paymentsReceived: true,
    imports: true,
    webhooks: false,
  },
  customers: zohoCustomers,
  items: zohoItems,
  estimates: zohoEstimates,
  invoices: zohoInvoices,
  recurringInvoices: zohoRecurringInvoices,
  payments: zohoPayments,
} satisfies AccountingProviderAdapter
