import { z } from 'zod'

import type {
  BillingDashboard,
  DashboardIssuedInvoiceTotals,
  DashboardReceivablesOverdue,
  DashboardRecurringRevenue,
  DashboardSalesThisMonth,
} from './dashboard'

const recurringRevenueSchema = z.strictObject({
  currency: z.string(),
  mrr: z.string(),
  arr: z.string(),
}) satisfies z.ZodType<DashboardRecurringRevenue>

const issuedInvoiceTotalsSchema = z.strictObject({
  currency: z.string(),
  totalIssued: z.string(),
  totalOutstanding: z.string(),
}) satisfies z.ZodType<DashboardIssuedInvoiceTotals>

const salesThisMonthSchema = z.strictObject({
  currency: z.string(),
  netSales: z.string(),
}) satisfies z.ZodType<DashboardSalesThisMonth>

const receivablesOverdueSchema = z.strictObject({
  currency: z.string(),
  overdue: z.string(),
}) satisfies z.ZodType<DashboardReceivablesOverdue>

/**
 * The schema for the Billing dashboard projection.
 *
 * Mirrors the shape returned by the Billing API's `dashboardOverview`. The
 * route declares `{ object: 'billing_dashboard' }` passthrough; the breakdown
 * rows are strict so currency rollups cannot silently change shape.
 */
export const BillingDashboardSchema = z.strictObject({
  object: z.literal('billing_dashboard'),
  activeSubscriptions: z.number().int(),
  trialingSubscriptions: z.number().int(),
  pausedSubscriptions: z.number().int(),
  cancelledSubscriptions: z.number().int(),
  customerCount: z.number().int(),
  productCount: z.number().int(),
  recurringRevenue: z.array(recurringRevenueSchema),
  draftQuoteCount: z.number().int(),
  issuedInvoiceTotals: z.array(issuedInvoiceTotalsSchema),
  salesThisMonth: z.array(salesThisMonthSchema),
  receivablesOverdue: z.array(receivablesOverdueSchema),
}) satisfies z.ZodType<BillingDashboard>
