export interface CurrencyMetric {
  currency: string
  mrr: bigint
  arr: bigint
}

export interface InvoiceMetric {
  currency: string
  totalIssued: bigint
  totalOutstanding: bigint
}

export interface DashboardOverview {
  activeSubscriptions: number
  trialingSubscriptions: number
  pausedSubscriptions: number
  cancelledSubscriptions: number
  customerCount: number
  productCount: number
  recurringRevenue: CurrencyMetric[]
  draftQuoteCount: number
  issuedInvoiceTotals: InvoiceMetric[]
}
