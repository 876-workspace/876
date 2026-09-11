import { z } from 'zod'

import type {
  CashSummary,
  CustomerSales,
  ItemSales,
  ItemSalesSummary,
  ReceivablesAging,
  ReportPreferences,
  SalesSummary,
  SubscriptionSummary,
} from './reporting'

const moneyBreakdownSchema = z.strictObject({
  count: z.number().int(),
  netAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
})

const sourceSplitSchema = z.strictObject({
  subscription: moneyBreakdownSchema,
  recurringInvoice: moneyBreakdownSchema,
  oneOff: moneyBreakdownSchema,
})

const netSalesSchema = z.strictObject({
  netAmount: z.string(),
  taxAmount: z.string(),
  totalAmount: z.string(),
})

export const SalesSummarySchema = z.strictObject({
  object: z.literal('sales-summary'),
  timezone: z.string(),
  fiscalYearStartMonth: z.number().int(),
  from: z.number().int(),
  to: z.number().int(),
  groupBy: z.enum(['day', 'week', 'month', 'none']),
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      totals: z.strictObject({
        invoices: moneyBreakdownSchema.extend({ bySource: sourceSplitSchema }),
        salesReceipts: moneyBreakdownSchema,
        creditNotes: moneyBreakdownSchema,
        netSales: netSalesSchema,
      }),
      buckets: z.array(
        z.strictObject({
          start: z.number().int(),
          end: z.number().int(),
          invoices: moneyBreakdownSchema.extend({
            bySource: sourceSplitSchema,
          }),
          salesReceipts: moneyBreakdownSchema,
          creditNotes: moneyBreakdownSchema,
          netSales: netSalesSchema,
        })
      ),
    })
  ),
}) satisfies z.ZodType<SalesSummary>

const cashLegSchema = z.strictObject({
  count: z.number().int(),
  amount: z.string(),
})

export const CashSummarySchema = z.strictObject({
  object: z.literal('cash-summary'),
  timezone: z.string(),
  fiscalYearStartMonth: z.number().int(),
  from: z.number().int(),
  to: z.number().int(),
  groupBy: z.enum(['day', 'week', 'month', 'none']),
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      totals: z.strictObject({
        payments: cashLegSchema,
        salesReceipts: cashLegSchema,
        refunds: cashLegSchema,
        netCash: z.string(),
      }),
      buckets: z.array(
        z.strictObject({
          start: z.number().int(),
          end: z.number().int(),
          payments: cashLegSchema,
          salesReceipts: cashLegSchema,
          refunds: cashLegSchema,
          netCash: z.string(),
        })
      ),
    })
  ),
}) satisfies z.ZodType<CashSummary>

export const ReceivablesAgingSchema = z.strictObject({
  object: z.literal('receivables-aging'),
  timezone: z.string(),
  asOf: z.number().int(),
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      buckets: z.strictObject({
        current: z.string(),
        days1To30: z.string(),
        days31To60: z.string(),
        days61To90: z.string(),
        over90: z.string(),
      }),
      totalOutstanding: z.string(),
      totalOverdue: z.string(),
      topCustomers: z.array(
        z.strictObject({
          customerId: z.string(),
          customerName: z.string().nullable(),
          outstanding: z.string(),
        })
      ),
    })
  ),
}) satisfies z.ZodType<ReceivablesAging>

const itemSalesRowSchema = z.strictObject({
  itemId: z.string(),
  variantId: z.string().nullable(),
  currency: z.string(),
  quantitySold: z.number().int(),
  quantityReturned: z.number().int(),
  netAmount: z.string(),
  documentCount: z.number().int(),
})

export const ItemSalesSchema = z.strictObject({
  object: z.literal('item-sales'),
  timezone: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  limit: z.number().int(),
  items: z.array(itemSalesRowSchema),
}) satisfies z.ZodType<ItemSales>

export const ItemSalesSummarySchema = z.strictObject({
  object: z.literal('item-sales-summary'),
  timezone: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  itemId: z.string(),
  rows: z.array(itemSalesRowSchema),
  monthlyBuckets: z.array(
    z.strictObject({
      currency: z.string(),
      buckets: z.array(
        z.strictObject({
          start: z.number().int(),
          end: z.number().int(),
          quantitySold: z.number().int(),
          quantityReturned: z.number().int(),
          netAmount: z.string(),
          documentCount: z.number().int(),
        })
      ),
    })
  ),
}) satisfies z.ZodType<ItemSalesSummary>

export const CustomerSalesSchema = z.strictObject({
  object: z.literal('customer-sales'),
  timezone: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  limit: z.number().int(),
  customers: z.array(
    z.strictObject({
      customerId: z.string(),
      customerName: z.string().nullable(),
      currency: z.string(),
      netSales: z.string(),
      documentCount: z.number().int(),
    })
  ),
}) satisfies z.ZodType<CustomerSales>

export const SubscriptionSummarySchema = z.strictObject({
  object: z.literal('subscription-summary'),
  timezone: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  groupBy: z.enum(['day', 'week', 'month', 'none']),
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      current: z.strictObject({
        active: z.number().int(),
        trialing: z.number().int(),
        paused: z.number().int(),
        mrr: z.string(),
        arr: z.string(),
      }),
      buckets: z.array(
        z.strictObject({
          start: z.number().int(),
          end: z.number().int(),
          new: z.number().int(),
          canceled: z.number().int(),
          ended: z.number().int(),
          paused: z.number().int(),
          subscriptionRevenue: z.string(),
        })
      ),
      churnRate: z.string().nullable(),
    })
  ),
}) satisfies z.ZodType<SubscriptionSummary>

export const ReportPreferencesSchema = z.strictObject({
  object: z.literal('report_preferences'),
  timezone: z.string(),
  fiscalYearStartMonth: z.number().int(),
}) satisfies z.ZodType<ReportPreferences>
