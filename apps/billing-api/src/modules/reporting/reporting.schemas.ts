import { z } from 'zod'

export const MAX_REPORT_RANGE_DAYS = 400

export const reportGroupBySchema = z.enum(['day', 'week', 'month', 'none'])

export const reportRangeQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().positive(),
  groupBy: reportGroupBySchema.default('day'),
  customerId: z.string().min(1).optional(),
  itemId: z.string().min(1).optional(),
})

export const cashSummaryQuerySchema = reportRangeQuerySchema.omit({
  itemId: true,
})

export const receivablesAgingQuerySchema = z.strictObject({
  asOf: z.coerce.number().int().positive().optional(),
  customerId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const itemSalesQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().positive(),
  itemId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const customerSalesQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const subscriptionSummaryQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().positive(),
  groupBy: reportGroupBySchema.default('month'),
  customerId: z.string().min(1).optional(),
})

export const itemSalesSummaryParamsSchema = z.strictObject({
  itemId: z.string().min(1),
})

export const itemSalesSummaryQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().positive().optional(),
})

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().min(1),
})

const money = z.string()

const salesBucketSchema = z.strictObject({
  start: z.number().int(),
  end: z.number().int(),
  invoices: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  salesReceipts: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  creditNotes: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  netSales: z.strictObject({
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
})

const invoiceSourceSplitSchema = z.strictObject({
  subscription: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  recurringInvoice: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  oneOff: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
})

const salesTotalsSchema = z.strictObject({
  invoices: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
    bySource: invoiceSourceSplitSchema,
  }),
  salesReceipts: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  creditNotes: z.strictObject({
    count: z.number().int(),
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
  netSales: z.strictObject({
    netAmount: money,
    taxAmount: money,
    totalAmount: money,
  }),
})

export const salesSummarySchema = z.strictObject({
  object: z.literal('sales-summary'),
  timezone: z.string(),
  fiscalYearStartMonth: z.number().int(),
  from: z.number().int(),
  to: z.number().int(),
  groupBy: reportGroupBySchema,
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      totals: salesTotalsSchema,
      buckets: z.array(salesBucketSchema),
    })
  ),
})

const cashBucketSchema = z.strictObject({
  start: z.number().int(),
  end: z.number().int(),
  payments: z.strictObject({ count: z.number().int(), amount: money }),
  salesReceipts: z.strictObject({ count: z.number().int(), amount: money }),
  refunds: z.strictObject({ count: z.number().int(), amount: money }),
  netCash: money,
})

export const cashSummarySchema = z.strictObject({
  object: z.literal('cash-summary'),
  timezone: z.string(),
  fiscalYearStartMonth: z.number().int(),
  from: z.number().int(),
  to: z.number().int(),
  groupBy: reportGroupBySchema,
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      totals: z.strictObject({
        payments: z.strictObject({ count: z.number().int(), amount: money }),
        salesReceipts: z.strictObject({
          count: z.number().int(),
          amount: money,
        }),
        refunds: z.strictObject({ count: z.number().int(), amount: money }),
        netCash: money,
      }),
      buckets: z.array(cashBucketSchema),
    })
  ),
})

const agingBucketsSchema = z.strictObject({
  current: money,
  days1To30: money,
  days31To60: money,
  days61To90: money,
  over90: money,
})

export const receivablesAgingSchema = z.strictObject({
  object: z.literal('receivables-aging'),
  timezone: z.string(),
  asOf: z.number().int(),
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      buckets: agingBucketsSchema,
      totalOutstanding: money,
      totalOverdue: money,
      topCustomers: z.array(
        z.strictObject({
          customerId: z.string(),
          customerName: z.string().nullable(),
          outstanding: money,
        })
      ),
    })
  ),
})

const itemSalesRowSchema = z.strictObject({
  itemId: z.string(),
  variantId: z.string().nullable(),
  currency: z.string(),
  quantitySold: z.number().int(),
  quantityReturned: z.number().int(),
  netAmount: money,
  documentCount: z.number().int(),
})

export const itemSalesSchema = z.strictObject({
  object: z.literal('item-sales'),
  timezone: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  limit: z.number().int(),
  items: z.array(itemSalesRowSchema),
})

export const itemSalesSummarySchema = z.strictObject({
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
          netAmount: money,
          documentCount: z.number().int(),
        })
      ),
    })
  ),
})

export const customerSalesSchema = z.strictObject({
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
      netSales: money,
      documentCount: z.number().int(),
    })
  ),
})

const subscriptionBucketSchema = z.strictObject({
  start: z.number().int(),
  end: z.number().int(),
  new: z.number().int(),
  canceled: z.number().int(),
  ended: z.number().int(),
  paused: z.number().int(),
  subscriptionRevenue: money,
})

export const subscriptionSummarySchema = z.strictObject({
  object: z.literal('subscription-summary'),
  timezone: z.string(),
  from: z.number().int(),
  to: z.number().int(),
  groupBy: reportGroupBySchema,
  currencies: z.array(
    z.strictObject({
      currency: z.string(),
      current: z.strictObject({
        active: z.number().int(),
        trialing: z.number().int(),
        paused: z.number().int(),
        mrr: money,
        arr: money,
      }),
      buckets: z.array(subscriptionBucketSchema),
      churnRate: z.string().nullable(),
    })
  ),
})

export const reportPreferencesSchema = z.strictObject({
  object: z.literal('report_preferences'),
  timezone: z.string(),
  fiscalYearStartMonth: z.number().int(),
})

export const reportPreferencesUpdateSchema = z
  .strictObject({
    timezone: z.string().min(1).max(64).optional(),
    fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field.')

export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>
export type CashSummaryQuery = z.infer<typeof cashSummaryQuerySchema>
export type ReceivablesAgingQuery = z.infer<typeof receivablesAgingQuerySchema>
export type ItemSalesQuery = z.infer<typeof itemSalesQuerySchema>
export type CustomerSalesQuery = z.infer<typeof customerSalesQuerySchema>
export type SubscriptionSummaryQuery = z.infer<
  typeof subscriptionSummaryQuerySchema
>
export type ItemSalesSummaryQuery = z.infer<typeof itemSalesSummaryQuerySchema>
export type ReportPreferencesUpdate = z.infer<
  typeof reportPreferencesUpdateSchema
>
