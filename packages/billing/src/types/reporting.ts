import type { RequestOptions } from './common'

export type ReportGroupBy = 'day' | 'week' | 'month' | 'none'

export interface ReportRangeParams {
  from: number
  to: number
  groupBy?: ReportGroupBy
  customerId?: string
  itemId?: string
}

export interface CashSummaryParams {
  from: number
  to: number
  groupBy?: ReportGroupBy
  customerId?: string
}

export interface ReceivablesAgingParams {
  asOf?: number
  customerId?: string
  limit?: number
}

export interface ItemSalesParams {
  from: number
  to: number
  itemId?: string
  limit?: number
}

export interface ItemSalesSummaryParams {
  from?: number
  to?: number
}

export interface CustomerSalesParams {
  from: number
  to: number
  limit?: number
}

export interface SubscriptionSummaryParams {
  from: number
  to: number
  groupBy?: ReportGroupBy
  customerId?: string
}

export interface ReportPreferences {
  object: 'report_preferences'
  timezone: string
  fiscalYearStartMonth: number
}

export interface ReportPreferencesUpdateParams {
  timezone?: string
  fiscalYearStartMonth?: number
}

export interface MoneyBreakdown {
  count: number
  netAmount: string
  taxAmount: string
  totalAmount: string
}

export interface InvoiceSourceSplit {
  subscription: MoneyBreakdown
  recurringInvoice: MoneyBreakdown
  oneOff: MoneyBreakdown
}

export interface SalesSummary {
  object: 'sales-summary'
  timezone: string
  fiscalYearStartMonth: number
  from: number
  to: number
  groupBy: ReportGroupBy
  currencies: Array<{
    currency: string
    totals: {
      invoices: MoneyBreakdown & { bySource: InvoiceSourceSplit }
      salesReceipts: MoneyBreakdown
      creditNotes: MoneyBreakdown
      netSales: { netAmount: string; taxAmount: string; totalAmount: string }
    }
    buckets: Array<{
      start: number
      end: number
      invoices: MoneyBreakdown & { bySource: InvoiceSourceSplit }
      salesReceipts: MoneyBreakdown
      creditNotes: MoneyBreakdown
      netSales: { netAmount: string; taxAmount: string; totalAmount: string }
    }>
  }>
}

export interface CashSummary {
  object: 'cash-summary'
  timezone: string
  fiscalYearStartMonth: number
  from: number
  to: number
  groupBy: ReportGroupBy
  currencies: Array<{
    currency: string
    totals: {
      payments: { count: number; amount: string }
      salesReceipts: { count: number; amount: string }
      refunds: { count: number; amount: string }
      netCash: string
    }
    buckets: Array<{
      start: number
      end: number
      payments: { count: number; amount: string }
      salesReceipts: { count: number; amount: string }
      refunds: { count: number; amount: string }
      netCash: string
    }>
  }>
}

export interface ReceivablesAging {
  object: 'receivables-aging'
  timezone: string
  asOf: number
  currencies: Array<{
    currency: string
    buckets: {
      current: string
      days1To30: string
      days31To60: string
      days61To90: string
      over90: string
    }
    totalOutstanding: string
    totalOverdue: string
    topCustomers: Array<{
      customerId: string
      customerName: string | null
      outstanding: string
    }>
  }>
}

export interface ItemSalesRow {
  itemId: string
  variantId: string | null
  currency: string
  quantitySold: number
  quantityReturned: number
  netAmount: string
  documentCount: number
}

export interface ItemSales {
  object: 'item-sales'
  timezone: string
  from: number
  to: number
  limit: number
  items: ItemSalesRow[]
}

export interface ItemSalesSummary {
  object: 'item-sales-summary'
  timezone: string
  from: number
  to: number
  itemId: string
  rows: ItemSalesRow[]
  monthlyBuckets: Array<{
    currency: string
    buckets: Array<{
      start: number
      end: number
      quantitySold: number
      quantityReturned: number
      netAmount: string
      documentCount: number
    }>
  }>
}

export interface CustomerSales {
  object: 'customer-sales'
  timezone: string
  from: number
  to: number
  limit: number
  customers: Array<{
    customerId: string
    customerName: string | null
    currency: string
    netSales: string
    documentCount: number
  }>
}

export interface SubscriptionSummary {
  object: 'subscription-summary'
  timezone: string
  from: number
  to: number
  groupBy: ReportGroupBy
  currencies: Array<{
    currency: string
    current: {
      active: number
      trialing: number
      paused: number
      mrr: string
      arr: string
    }
    buckets: Array<{
      start: number
      end: number
      new: number
      canceled: number
      ended: number
      paused: number
      subscriptionRevenue: string
    }>
    churnRate: string | null
  }>
}

export type { RequestOptions }
