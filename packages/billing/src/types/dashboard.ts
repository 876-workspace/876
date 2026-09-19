/**
 * Billing dashboard projection.
 *
 * The dashboard is a read-only rollup over subscriptions, invoices, receipts,
 * and receivables for one workspace. It is an internal-key projection served
 * by the Billing server client rather than the tenant client.
 */

/**
 * Recurring revenue for one currency.
 */
export interface DashboardRecurringRevenue {
  /**
   * Three-letter ISO currency code.
   */
  currency: string

  /**
   * Monthly recurring revenue in the currency's smallest unit, as an integer string.
   */
  mrr: string

  /**
   * Annual recurring revenue in the currency's smallest unit, as an integer string.
   */
  arr: string
}

/**
 * Issued invoice totals for one currency.
 */
export interface DashboardIssuedInvoiceTotals {
  /**
   * Three-letter ISO currency code.
   */
  currency: string

  /**
   * Total issued amount in the currency's smallest unit, as an integer string.
   */
  totalIssued: string

  /**
   * Total outstanding amount in the currency's smallest unit, as an integer string.
   */
  totalOutstanding: string
}

/**
 * Net sales for the current month in one currency.
 */
export interface DashboardSalesThisMonth {
  /**
   * Three-letter ISO currency code.
   */
  currency: string

  /**
   * Net sales in the currency's smallest unit, as an integer string.
   */
  netSales: string
}

/**
 * Overdue receivables for one currency.
 */
export interface DashboardReceivablesOverdue {
  /**
   * Three-letter ISO currency code.
   */
  currency: string

  /**
   * Overdue amount in the currency's smallest unit, as an integer string.
   */
  overdue: string
}

/**
 * This object represents the Billing dashboard projection for one workspace.
 *
 * Mirrors the shape returned by the Billing API's `dashboardOverview` for
 * `GET /internal/projections/tenants/:tenantId/dashboard`. Money stays in
 * integer minor-unit strings end to end.
 */
export interface BillingDashboard {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'billing_dashboard'

  /**
   * Number of active subscriptions.
   */
  activeSubscriptions: number

  /**
   * Number of trialing subscriptions.
   */
  trialingSubscriptions: number

  /**
   * Number of paused subscriptions.
   */
  pausedSubscriptions: number

  /**
   * Number of canceled subscriptions.
   */
  cancelledSubscriptions: number

  /**
   * Number of customers in the workspace.
   */
  customerCount: number

  /**
   * Number of products in the workspace.
   */
  productCount: number

  /**
   * Recurring revenue broken down by currency.
   */
  recurringRevenue: DashboardRecurringRevenue[]

  /**
   * Number of draft quotes in the workspace.
   */
  draftQuoteCount: number

  /**
   * Issued invoice totals broken down by currency.
   */
  issuedInvoiceTotals: DashboardIssuedInvoiceTotals[]

  /**
   * Net sales for the current month broken down by currency.
   */
  salesThisMonth: DashboardSalesThisMonth[]

  /**
   * Overdue receivables broken down by currency.
   */
  receivablesOverdue: DashboardReceivablesOverdue[]
}
