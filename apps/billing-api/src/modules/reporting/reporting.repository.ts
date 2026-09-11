import { prisma } from '@/db/client'
import { Prisma } from '@/db/generated/prisma/client'

import { combineMrrRows, mrrAnnualSql } from './mrr'

export type ReportGroupBy = 'day' | 'week' | 'month' | 'none'

export type Bucket = { start: number; end: number }

export type RangeFilter = {
  from: number
  to: number
  customerId?: string
  itemId?: string
}

/** Finalized sales documents: collectible or settled, never draft or void. */
const SALE_INVOICE_STATUSES = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
  'UNCOLLECTIBLE',
] as const

/** Issued credit notes: open or fully applied/closed, never draft or void. */
const ISSUED_CREDIT_NOTE_STATUSES = ['OPEN', 'CLOSED'] as const

/** Cash that counts as received: succeeded, partially refunded, or refunded. */
const RECEIVED_PAYMENT_STATUSES = [
  'SUCCEEDED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const

/** Open receivables: collectible invoices with a remaining balance. */
const COLLECTIBLE_INVOICE_STATUSES = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const

const BUCKET_TRUNC: Record<Exclude<ReportGroupBy, 'none'>, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
}

const BUCKET_INTERVAL: Record<Exclude<ReportGroupBy, 'none'>, string> = {
  day: '1 day',
  week: '1 week',
  month: '1 month',
}

function money(value: unknown): string {
  if (value === null || value === undefined) return '0'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') return BigInt(Math.trunc(value)).toString()
  if (typeof value !== 'string') return '0'
  const text = value.trim()
  if (text === '') return '0'
  const [integer = '0'] = text.split('.')
  const normalized = integer === '' || integer === '-' ? '0' : integer
  return BigInt(normalized).toString()
}

function count(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return Math.trunc(value)
  if (typeof value !== 'string') return 0
  return Number.parseInt(value, 10) || 0
}

/**
 * SQL expression for the tenant-timezone bucket start (unix seconds) of a
 * unix-second timestamp column. Weeks use Postgres `date_trunc('week')`,
 * which starts Monday. For `none` the bucket is the range start itself.
 */
function bucketStartSql(
  groupBy: ReportGroupBy,
  column: Prisma.Sql,
  timezone: string,
  from: number
): Prisma.Sql {
  if (groupBy === 'none') return Prisma.sql`${from}`
  const trunc = BUCKET_TRUNC[groupBy]
  return Prisma.sql`(EXTRACT(EPOCH FROM (date_trunc(${trunc}, to_timestamp(${column}) AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone}))::bigint)`
}

/**
 * Emits every bucket in [from, to) so charts need no gap-filling. Buckets are
 * computed in the tenant timezone; the spine comes from SQL, never from
 * JS-side date math.
 */
export async function bucketSpine(
  groupBy: ReportGroupBy,
  from: number,
  to: number,
  timezone: string
): Promise<Bucket[]> {
  if (groupBy === 'none') return [{ start: from, end: to }]
  const trunc = BUCKET_TRUNC[groupBy]
  const interval = BUCKET_INTERVAL[groupBy]
  const rows = await prisma.$queryRaw<Array<{ start: unknown; end: unknown }>>(
    Prisma.sql`
      SELECT
        (EXTRACT(EPOCH FROM (spine.bucket_local AT TIME ZONE ${timezone}))::bigint) AS "start",
        (EXTRACT(EPOCH FROM ((spine.bucket_local + ${interval}::interval) AT TIME ZONE ${timezone}))::bigint) AS "end"
      FROM generate_series(
        date_trunc(${trunc}, to_timestamp(${from}) AT TIME ZONE ${timezone}),
        date_trunc(${trunc}, (to_timestamp(${to}) - INTERVAL '1 second') AT TIME ZONE ${timezone}),
        ${interval}::interval
      ) AS spine(bucket_local)
      ORDER BY "start"
    `
  )
  return rows.map((row) => ({
    start: count(row.start),
    end: count(row.end),
  }))
}

export type InvoiceSalesRow = {
  bucketStart: number
  currency: string
  billingReason: string
  count: number
  netAmount: string
  taxAmount: string
  totalAmount: string
}

/**
 * Finalized non-void invoice sales (UNCOLLECTIBLE still counts — the sale
 * happened) by issue instant. Opening-balance invoices are not sales and are
 * excluded here. Aggregated in SQL; never loads document rows.
 */
export async function invoiceSalesRows(
  tenantId: string,
  filter: RangeFilter,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<InvoiceSalesRow[]> {
  const bucket = bucketStartSql(
    groupBy,
    Prisma.sql`i.issue_at`,
    timezone,
    filter.from
  )
  const customer = filter.customerId
    ? Prisma.sql`AND i.customer_id = ${filter.customerId}`
    : Prisma.empty
  const item = filter.itemId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM billing_invoice_lines AS l
        WHERE l.invoice_id = i.id AND l.item_id = ${filter.itemId}
      )`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      bucketStart: unknown
      currency: string
      billingReason: string
      count: unknown
      netAmount: unknown
      taxAmount: unknown
      totalAmount: unknown
    }>
  >(Prisma.sql`
    SELECT
      ${bucket} AS "bucketStart",
      i.currency AS "currency",
      i.billing_reason AS "billingReason",
      COUNT(*)::int AS "count",
      SUM(i.subtotal_amount - i.discount_amount)::bigint AS "netAmount",
      SUM(i.tax_amount)::bigint AS "taxAmount",
      SUM(i.total_amount)::bigint AS "totalAmount"
    FROM billing_invoices AS i
    WHERE i.tenant_id = ${tenantId}
      AND i.issue_at >= ${filter.from}
      AND i.issue_at < ${filter.to}
      AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'UNCOLLECTIBLE')
      AND i.billing_reason <> 'OPENING_BALANCE'
      ${customer}
      ${item}
    GROUP BY "bucketStart", i.currency, i.billing_reason
  `)
  return rows.map((row) => ({
    bucketStart: count(row.bucketStart),
    currency: row.currency.toUpperCase(),
    billingReason: row.billingReason,
    count: count(row.count),
    netAmount: money(row.netAmount),
    taxAmount: money(row.taxAmount),
    totalAmount: money(row.totalAmount),
  }))
}

export type DocumentSalesRow = {
  bucketStart: number
  currency: string
  count: number
  netAmount: string
  taxAmount: string
  totalAmount: string
}

/** Non-void (PAID) Sales Receipts by receipt instant, aggregated in SQL. */
export async function salesReceiptRows(
  tenantId: string,
  filter: RangeFilter,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<DocumentSalesRow[]> {
  const bucket = bucketStartSql(
    groupBy,
    Prisma.sql`s.receipt_at`,
    timezone,
    filter.from
  )
  const customer = filter.customerId
    ? Prisma.sql`AND s.customer_id = ${filter.customerId}`
    : Prisma.empty
  const item = filter.itemId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM billing_sales_receipt_lines AS l
        WHERE l.sales_receipt_id = s.id AND l.item_id = ${filter.itemId}
      )`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      bucketStart: unknown
      currency: string
      count: unknown
      netAmount: unknown
      taxAmount: unknown
      totalAmount: unknown
    }>
  >(Prisma.sql`
    SELECT
      ${bucket} AS "bucketStart",
      s.currency AS "currency",
      COUNT(*)::int AS "count",
      SUM(s.subtotal_amount - s.discount_amount)::bigint AS "netAmount",
      SUM(s.tax_amount)::bigint AS "taxAmount",
      SUM(s.total_amount)::bigint AS "totalAmount"
    FROM billing_sales_receipts AS s
    WHERE s.tenant_id = ${tenantId}
      AND s.receipt_at >= ${filter.from}
      AND s.receipt_at < ${filter.to}
      AND s.status = 'PAID'
      ${customer}
      ${item}
    GROUP BY "bucketStart", s.currency
  `)
  return rows.map((row) => ({
    bucketStart: count(row.bucketStart),
    currency: row.currency.toUpperCase(),
    count: count(row.count),
    netAmount: money(row.netAmount),
    taxAmount: money(row.taxAmount),
    totalAmount: money(row.totalAmount),
  }))
}

/**
 * Issued non-void credit notes by issue instant. Credit notes carry no
 * discount column, so the pre-tax net is the subtotal. Aggregated in SQL.
 */
export async function creditNoteRows(
  tenantId: string,
  filter: RangeFilter,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<DocumentSalesRow[]> {
  const bucket = bucketStartSql(
    groupBy,
    Prisma.sql`c.issue_at`,
    timezone,
    filter.from
  )
  const customer = filter.customerId
    ? Prisma.sql`AND c.customer_id = ${filter.customerId}`
    : Prisma.empty
  const item = filter.itemId
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM billing_credit_note_lines AS l
        WHERE l.credit_note_id = c.id AND l.item_id = ${filter.itemId}
      )`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      bucketStart: unknown
      currency: string
      count: unknown
      netAmount: unknown
      taxAmount: unknown
      totalAmount: unknown
    }>
  >(Prisma.sql`
    SELECT
      ${bucket} AS "bucketStart",
      c.currency AS "currency",
      COUNT(*)::int AS "count",
      SUM(c.subtotal_amount)::bigint AS "netAmount",
      SUM(c.tax_amount)::bigint AS "taxAmount",
      SUM(c.total_amount)::bigint AS "totalAmount"
    FROM billing_credit_notes AS c
    WHERE c.tenant_id = ${tenantId}
      AND c.issue_at >= ${filter.from}
      AND c.issue_at < ${filter.to}
      AND c.status IN ('OPEN', 'CLOSED')
      ${customer}
      ${item}
    GROUP BY "bucketStart", c.currency
  `)
  return rows.map((row) => ({
    bucketStart: count(row.bucketStart),
    currency: row.currency.toUpperCase(),
    count: count(row.count),
    netAmount: money(row.netAmount),
    taxAmount: money(row.taxAmount),
    totalAmount: money(row.totalAmount),
  }))
}

export type CashRow = {
  bucketStart: number
  currency: string
  isSalesReceiptCash: boolean
  count: number
  amount: string
}

/**
 * Received cash by payment instant, split into receivables cash and
 * immediate-sale cash. Sales-Receipt-linked payments are cash evidence owned
 * by the receipt (their `unappliedAmount` is 0), so they are separated here
 * exactly as the Payments Received list excludes them
 * (`salesReceipt: { is: null }`).
 */
export async function paymentCashRows(
  tenantId: string,
  filter: Omit<RangeFilter, 'itemId'>,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<CashRow[]> {
  const bucket = bucketStartSql(
    groupBy,
    Prisma.sql`p.payment_date`,
    timezone,
    filter.from
  )
  const customer = filter.customerId
    ? Prisma.sql`AND p.customer_id = ${filter.customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      bucketStart: unknown
      currency: string
      isSalesReceiptCash: boolean
      count: unknown
      amount: unknown
    }>
  >(Prisma.sql`
    SELECT
      ${bucket} AS "bucketStart",
      p.currency AS "currency",
      (sr.id IS NOT NULL) AS "isSalesReceiptCash",
      COUNT(*)::int AS "count",
      SUM(p.amount)::bigint AS "amount"
    FROM billing_payments AS p
    LEFT JOIN billing_sales_receipts AS sr
      ON sr.tenant_id = p.tenant_id AND sr.payment_id = p.id
    WHERE p.tenant_id = ${tenantId}
      AND p.payment_date >= ${filter.from}
      AND p.payment_date < ${filter.to}
      AND p.status IN ('SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED')
      ${customer}
    GROUP BY "bucketStart", p.currency, "isSalesReceiptCash"
  `)
  return rows.map((row) => ({
    bucketStart: count(row.bucketStart),
    currency: row.currency.toUpperCase(),
    isSalesReceiptCash: row.isSalesReceiptCash,
    count: count(row.count),
    amount: money(row.amount),
  }))
}

export type RefundRow = {
  bucketStart: number
  currency: string
  count: number
  amount: string
}

/** Cash returned to customers by refund instant, aggregated in SQL. */
export async function refundRows(
  tenantId: string,
  filter: Omit<RangeFilter, 'itemId'>,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<RefundRow[]> {
  const bucket = bucketStartSql(
    groupBy,
    Prisma.sql`r.refunded_at`,
    timezone,
    filter.from
  )
  const customer = filter.customerId
    ? Prisma.sql`AND r.customer_id = ${filter.customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      bucketStart: unknown
      currency: string
      count: unknown
      amount: unknown
    }>
  >(Prisma.sql`
    SELECT
      ${bucket} AS "bucketStart",
      r.currency AS "currency",
      COUNT(*)::int AS "count",
      SUM(r.amount)::bigint AS "amount"
    FROM billing_refunds AS r
    WHERE r.tenant_id = ${tenantId}
      AND r.refunded_at >= ${filter.from}
      AND r.refunded_at < ${filter.to}
      ${customer}
    GROUP BY "bucketStart", r.currency
  `)
  return rows.map((row) => ({
    bucketStart: count(row.bucketStart),
    currency: row.currency.toUpperCase(),
    count: count(row.count),
    amount: money(row.amount),
  }))
}

export type AgingRow = {
  currency: string
  current: string
  days1To30: string
  days31To60: string
  days61To90: string
  over90: string
  totalOutstanding: string
}

/**
 * Receivables aging as of an instant: open collectible invoices' remaining
 * balances bucketed by whole days past due. Invoices with no due date, or
 * due today or later (day 0 and negative), are current. Boundaries: day 1
 * enters 1–30, day 31 enters 31–60, day 61 enters 61–90, day 91 enters 90+.
 */
export async function receivablesAgingRows(
  tenantId: string,
  asOf: number,
  customerId?: string
): Promise<AgingRow[]> {
  const customer = customerId
    ? Prisma.sql`AND i.customer_id = ${customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      currency: string
      current: unknown
      days1To30: unknown
      days31To60: unknown
      days61To90: unknown
      over90: unknown
      totalOutstanding: unknown
    }>
  >(Prisma.sql`
    SELECT
      aged.currency AS "currency",
      SUM(CASE WHEN aged."daysPast" IS NULL OR aged."daysPast" <= 0 THEN aged.amount_due ELSE 0 END)::bigint AS "current",
      SUM(CASE WHEN aged."daysPast" BETWEEN 1 AND 30 THEN aged.amount_due ELSE 0 END)::bigint AS "days1To30",
      SUM(CASE WHEN aged."daysPast" BETWEEN 31 AND 60 THEN aged.amount_due ELSE 0 END)::bigint AS "days31To60",
      SUM(CASE WHEN aged."daysPast" BETWEEN 61 AND 90 THEN aged.amount_due ELSE 0 END)::bigint AS "days61To90",
      SUM(CASE WHEN aged."daysPast" > 90 THEN aged.amount_due ELSE 0 END)::bigint AS "over90",
      SUM(aged.amount_due)::bigint AS "totalOutstanding"
    FROM (
      SELECT
        i.currency AS currency,
        i.amount_due AS amount_due,
        CASE
          WHEN i.due_at IS NULL THEN NULL
          ELSE FLOOR((${asOf} - i.due_at) / 86400.0)
        END AS "daysPast"
      FROM billing_invoices AS i
      WHERE i.tenant_id = ${tenantId}
        AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE')
        AND i.amount_due > 0
        ${customer}
    ) AS aged
    GROUP BY aged.currency
  `)
  return rows.map((row) => ({
    currency: row.currency.toUpperCase(),
    current: money(row.current),
    days1To30: money(row.days1To30),
    days31To60: money(row.days31To60),
    days61To90: money(row.days61To90),
    over90: money(row.over90),
    totalOutstanding: money(
      row.totalOutstanding
    ),
  }))
}

export type AgingCustomerRow = {
  customerId: string
  customerName: string | null
  currency: string
  outstanding: string
}

/** Top customers by outstanding collectible balance, per currency. */
export async function receivablesTopCustomers(
  tenantId: string,
  limit: number,
  customerId?: string
): Promise<AgingCustomerRow[]> {
  const customer = customerId
    ? Prisma.sql`AND i.customer_id = ${customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      customerId: string
      customerName: string | null
      currency: string
      outstanding: unknown
    }>
  >(Prisma.sql`
    SELECT
      i.customer_id AS "customerId",
      c.name AS "customerName",
      i.currency AS "currency",
      SUM(i.amount_due)::bigint AS "outstanding"
    FROM billing_invoices AS i
    INNER JOIN billing_customers AS c
      ON c.id = i.customer_id AND c.tenant_id = i.tenant_id
    WHERE i.tenant_id = ${tenantId}
      AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE')
      AND i.amount_due > 0
      ${customer}
    GROUP BY i.customer_id, c.name, i.currency
    ORDER BY "outstanding" DESC
    LIMIT ${limit}
  `)
  return rows.map((row) => ({
    customerId: row.customerId,
    customerName: row.customerName,
    currency: row.currency.toUpperCase(),
    outstanding: money(row.outstanding),
  }))
}

export type ItemSalesRow = {
  itemId: string
  variantId: string | null
  currency: string
  quantitySold: number
  quantityReturned: number
  netAmount: string
  documentCount: number
}

/**
 * Line-level item sales across invoices, sales receipts (sold) and credit
 * notes (returned). One bounded aggregate row per item/variant/currency;
 * variants stay separated and NULL-variant lines group together.
 */
export async function itemSalesRows(
  tenantId: string,
  filter: Omit<RangeFilter, 'customerId'>,
  limit: number
): Promise<ItemSalesRow[]> {
  const item =
    filter.itemId !== undefined
      ? Prisma.sql`AND l.item_id = ${filter.itemId}`
      : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{
      itemId: string
      variantId: string | null
      currency: string
      quantitySold: unknown
      quantityReturned: unknown
      netAmount: unknown
      documentCount: unknown
    }>
  >(Prisma.sql`
    SELECT
      legs.item_id AS "itemId",
      legs.variant_id AS "variantId",
      legs.currency AS "currency",
      SUM(CASE WHEN legs.kind = 'sale' THEN legs.quantity ELSE 0 END)::bigint AS "quantitySold",
      SUM(CASE WHEN legs.kind = 'return' THEN legs.quantity ELSE 0 END)::bigint AS "quantityReturned",
      SUM(CASE WHEN legs.kind = 'sale' THEN legs.total ELSE -legs.total END)::bigint AS "netAmount",
      COUNT(DISTINCT (legs.kind || ':' || legs.document_id))::int AS "documentCount"
    FROM (
      SELECT l.item_id, l.variant_id, i.currency, l.quantity, l.total_amount AS total, i.id AS document_id, 'sale' AS kind
      FROM billing_invoice_lines AS l
      INNER JOIN billing_invoices AS i ON i.id = l.invoice_id
      WHERE i.tenant_id = ${tenantId}
        AND i.issue_at >= ${filter.from}
        AND i.issue_at < ${filter.to}
        AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'UNCOLLECTIBLE')
        AND i.billing_reason <> 'OPENING_BALANCE'
        AND l.item_id IS NOT NULL
      UNION ALL
      SELECT l.item_id, l.variant_id, s.currency, l.quantity, l.total_amount AS total, s.id AS document_id, 'sale' AS kind
      FROM billing_sales_receipt_lines AS l
      INNER JOIN billing_sales_receipts AS s ON s.id = l.sales_receipt_id
      WHERE s.tenant_id = ${tenantId}
        AND s.receipt_at >= ${filter.from}
        AND s.receipt_at < ${filter.to}
        AND s.status = 'PAID'
        AND l.item_id IS NOT NULL
      UNION ALL
      SELECT l.item_id, l.variant_id, c.currency, l.quantity, l.total_amount AS total, c.id AS document_id, 'return' AS kind
      FROM billing_credit_note_lines AS l
      INNER JOIN billing_credit_notes AS c ON c.id = l.credit_note_id
      WHERE c.tenant_id = ${tenantId}
        AND c.issue_at >= ${filter.from}
        AND c.issue_at < ${filter.to}
        AND c.status IN ('OPEN', 'CLOSED')
        AND l.item_id IS NOT NULL
    ) AS legs
    WHERE legs.item_id IS NOT NULL
      ${item}
    GROUP BY legs.item_id, legs.variant_id, legs.currency
    ORDER BY "netAmount" DESC
    LIMIT ${limit}
  `)
  return rows.map((row) => ({
    itemId: row.itemId,
    variantId: row.variantId,
    currency: row.currency.toUpperCase(),
    quantitySold: count(row.quantitySold),
    quantityReturned: count(row.quantityReturned),
    netAmount: money(row.netAmount),
    documentCount: count(row.documentCount),
  }))
}

export type ItemBucketRow = {
  bucketStart: number
  currency: string
  quantitySold: number
  quantityReturned: number
  netAmount: string
  documentCount: number
}

/** Monthly (or day/week) item buckets for one item, per currency. */
export async function itemBucketRows(
  tenantId: string,
  itemId: string,
  filter: Omit<RangeFilter, 'itemId' | 'customerId'>,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<ItemBucketRow[]> {
  const dayBucket = bucketStartSql(
    groupBy,
    Prisma.sql`legs.document_at`,
    timezone,
    filter.from
  )
  const rows = await prisma.$queryRaw<
    Array<{
      bucketStart: unknown
      currency: string
      quantitySold: unknown
      quantityReturned: unknown
      netAmount: unknown
      documentCount: unknown
    }>
  >(Prisma.sql`
    SELECT
      ${dayBucket} AS "bucketStart",
      legs.currency AS "currency",
      SUM(CASE WHEN legs.kind = 'sale' THEN legs.quantity ELSE 0 END)::bigint AS "quantitySold",
      SUM(CASE WHEN legs.kind = 'return' THEN legs.quantity ELSE 0 END)::bigint AS "quantityReturned",
      SUM(CASE WHEN legs.kind = 'sale' THEN legs.total ELSE -legs.total END)::bigint AS "netAmount",
      COUNT(DISTINCT (legs.kind || ':' || legs.document_id))::int AS "documentCount"
    FROM (
      SELECT i.issue_at AS document_at, i.currency, l.quantity, l.total_amount AS total, i.id AS document_id, 'sale' AS kind
      FROM billing_invoice_lines AS l
      INNER JOIN billing_invoices AS i ON i.id = l.invoice_id
      WHERE i.tenant_id = ${tenantId}
        AND i.issue_at >= ${filter.from}
        AND i.issue_at < ${filter.to}
        AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'UNCOLLECTIBLE')
        AND i.billing_reason <> 'OPENING_BALANCE'
        AND l.item_id = ${itemId}
      UNION ALL
      SELECT s.receipt_at AS document_at, s.currency, l.quantity, l.total_amount AS total, s.id AS document_id, 'sale' AS kind
      FROM billing_sales_receipt_lines AS l
      INNER JOIN billing_sales_receipts AS s ON s.id = l.sales_receipt_id
      WHERE s.tenant_id = ${tenantId}
        AND s.receipt_at >= ${filter.from}
        AND s.receipt_at < ${filter.to}
        AND s.status = 'PAID'
        AND l.item_id = ${itemId}
      UNION ALL
      SELECT c.issue_at AS document_at, c.currency, l.quantity, l.total_amount AS total, c.id AS document_id, 'return' AS kind
      FROM billing_credit_note_lines AS l
      INNER JOIN billing_credit_notes AS c ON c.id = l.credit_note_id
      WHERE c.tenant_id = ${tenantId}
        AND c.issue_at >= ${filter.from}
        AND c.issue_at < ${filter.to}
        AND c.status IN ('OPEN', 'CLOSED')
        AND l.item_id = ${itemId}
    ) AS legs
    GROUP BY "bucketStart", legs.currency
  `)
  return rows.map((row) => ({
    bucketStart: count(row.bucketStart),
    currency: row.currency.toUpperCase(),
    quantitySold: count(row.quantitySold),
    quantityReturned: count(row.quantityReturned),
    netAmount: money(row.netAmount),
    documentCount: count(row.documentCount),
  }))
}

export type CustomerSalesRow = {
  customerId: string
  customerName: string | null
  currency: string
  netSales: string
  documentCount: number
}

/** Top customers by net sales (invoices + receipts − credits), per currency. */
export async function customerSalesRows(
  tenantId: string,
  filter: Omit<RangeFilter, 'customerId' | 'itemId'>,
  limit: number
): Promise<CustomerSalesRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      customerId: string
      customerName: string | null
      currency: string
      netSales: unknown
      documentCount: unknown
    }>
  >(Prisma.sql`
    SELECT
      sales.customer_id AS "customerId",
      c.name AS "customerName",
      sales.currency AS "currency",
      SUM(sales.net)::bigint AS "netSales",
      COUNT(DISTINCT (sales.kind || ':' || sales.document_id))::int AS "documentCount"
    FROM (
      SELECT i.customer_id, i.currency, (i.subtotal_amount - i.discount_amount) AS net, i.id AS document_id, 'invoice' AS kind
      FROM billing_invoices AS i
      WHERE i.tenant_id = ${tenantId}
        AND i.issue_at >= ${filter.from}
        AND i.issue_at < ${filter.to}
        AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'UNCOLLECTIBLE')
        AND i.billing_reason <> 'OPENING_BALANCE'
      UNION ALL
      SELECT s.customer_id, s.currency, (s.subtotal_amount - s.discount_amount) AS net, s.id AS document_id, 'receipt' AS kind
      FROM billing_sales_receipts AS s
      WHERE s.tenant_id = ${tenantId}
        AND s.receipt_at >= ${filter.from}
        AND s.receipt_at < ${filter.to}
        AND s.status = 'PAID'
      UNION ALL
      SELECT n.customer_id, n.currency, -n.subtotal_amount AS net, n.id AS document_id, 'credit' AS kind
      FROM billing_credit_notes AS n
      WHERE n.tenant_id = ${tenantId}
        AND n.issue_at >= ${filter.from}
        AND n.issue_at < ${filter.to}
        AND n.status IN ('OPEN', 'CLOSED')
    ) AS sales
    INNER JOIN billing_customers AS c
      ON c.id = sales.customer_id AND c.tenant_id = ${tenantId}
    GROUP BY sales.customer_id, c.name, sales.currency
    ORDER BY "netSales" DESC
    LIMIT ${limit}
  `)
  return rows.map((row) => ({
    customerId: row.customerId,
    customerName: row.customerName,
    currency: row.currency.toUpperCase(),
    netSales: money(row.netSales),
    documentCount: count(row.documentCount),
  }))
}

export type SubscriptionEventRow = {
  event: string
  bucketStart: number
  count: number
}

/**
 * Lifecycle events bucketed in the tenant timezone. `new` uses
 * `startAt ?? createdAt`; canceled/ended/paused use their own timestamps.
 */
export async function subscriptionEventRows(
  tenantId: string,
  filter: Omit<RangeFilter, 'itemId'>,
  groupBy: ReportGroupBy,
  timezone: string
): Promise<SubscriptionEventRow[]> {
  const newBucket = bucketStartSql(
    groupBy,
    Prisma.sql`COALESCE(s.start_at, s.created_at)`,
    timezone,
    filter.from
  )
  const canceledBucket = bucketStartSql(
    groupBy,
    Prisma.sql`s.canceled_at`,
    timezone,
    filter.from
  )
  const endedBucket = bucketStartSql(
    groupBy,
    Prisma.sql`s.ended_at`,
    timezone,
    filter.from
  )
  const pausedBucket = bucketStartSql(
    groupBy,
    Prisma.sql`s.paused_at`,
    timezone,
    filter.from
  )
  const customer = filter.customerId
    ? Prisma.sql`AND s.customer_id = ${filter.customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{ event: string; bucketStart: unknown; count: unknown }>
  >(Prisma.sql`
    SELECT events.event AS "event", events."bucketStart" AS "bucketStart", COUNT(*)::int AS "count"
    FROM (
      SELECT 'new' AS event, ${newBucket} AS "bucketStart"
      FROM billing_subscriptions AS s
      WHERE s.tenant_id = ${tenantId}
        AND COALESCE(s.start_at, s.created_at) >= ${filter.from}
        AND COALESCE(s.start_at, s.created_at) < ${filter.to}
        ${customer}
      UNION ALL
      SELECT 'canceled' AS event, ${canceledBucket} AS "bucketStart"
      FROM billing_subscriptions AS s
      WHERE s.tenant_id = ${tenantId}
        AND s.canceled_at >= ${filter.from}
        AND s.canceled_at < ${filter.to}
        ${customer}
      UNION ALL
      SELECT 'ended' AS event, ${endedBucket} AS "bucketStart"
      FROM billing_subscriptions AS s
      WHERE s.tenant_id = ${tenantId}
        AND s.ended_at >= ${filter.from}
        AND s.ended_at < ${filter.to}
        ${customer}
      UNION ALL
      SELECT 'paused' AS event, ${pausedBucket} AS "bucketStart"
      FROM billing_subscriptions AS s
      WHERE s.tenant_id = ${tenantId}
        AND s.paused_at >= ${filter.from}
        AND s.paused_at < ${filter.to}
        ${customer}
    ) AS events
    GROUP BY events.event, events."bucketStart"
  `)
  return rows.map((row) => ({
    event: row.event,
    bucketStart: count(row.bucketStart),
    count: count(row.count),
  }))
}

/**
 * Subscriptions that were active when the range started: begun before `from`
 * and neither canceled nor ended before `from`. Drives the churn denominator.
 */
export async function activeSubscriptionsAt(
  tenantId: string,
  from: number,
  customerId?: string
): Promise<number> {
  const customer = customerId
    ? Prisma.sql`AND s.customer_id = ${customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<Array<{ count: unknown }>>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM billing_subscriptions AS s
    WHERE s.tenant_id = ${tenantId}
      AND COALESCE(s.start_at, s.created_at) < ${from}
      AND (s.canceled_at IS NULL OR s.canceled_at >= ${from})
      AND (s.ended_at IS NULL OR s.ended_at >= ${from})
      ${customer}
  `)
  return count(rows[0]?.count)
}

/** Current MRR/ARR per currency — the one implementation both the dashboard
 * and the subscription summary share. */
export async function currentMrrByCurrency(
  tenantId: string,
  customerId?: string
): Promise<Array<{ currency: string; mrr: string; arr: string }>> {
  const customer = customerId
    ? Prisma.sql`AND "sub"."customer_id" = ${customerId}`
    : Prisma.empty
  const rows = await prisma.$queryRaw<
    Array<{ currency: string; annual: unknown }>
  >(Prisma.sql`
    SELECT
      UPPER("price"."currency") AS "currency",
      SUM(${mrrAnnualSql()}) AS "annual"
    FROM billing_subscriptions AS "sub"
    INNER JOIN billing_subscription_items AS "item"
      ON "item"."subscription_id" = "sub"."id"
    INNER JOIN billing_prices AS "price"
      ON "price"."id" = "item"."price_id"
    WHERE "sub"."tenant_id" = ${tenantId}
      ${customer}
      AND "sub"."status" IN ('ACTIVE', 'TRIALING')
      AND "price"."price_type" = 'RECURRING'
      AND COALESCE("item"."unit_amount", "price"."unit_amount") IS NOT NULL
      AND "price"."interval_unit" IS NOT NULL
      AND "price"."interval_count" IS NOT NULL
      AND "price"."interval_count" >= 1
    GROUP BY UPPER("price"."currency")
  `)
  return combineMrrRows(
    rows.map((row) => ({
      currency: row.currency,
      annual: row.annual,
    }))
  )
}

/** Active subscription count for one customer (projection enrichment). */
export async function activeSubscriptionCount(
  tenantId: string,
  customerId: string
): Promise<number> {
  return prisma.subscription.count({
    where: {
      tenantId,
      customerId,
      status: { in: ['ACTIVE', 'TRIALING'] },
      deletedAt: null,
    },
  })
}

export type StatusCountRow = { status: string; count: number }

/** Subscription counts by status via a bounded groupBy (no row loading). */
export async function subscriptionStatusCounts(
  tenantId: string,
  customerId?: string
): Promise<StatusCountRow[]> {
  const rows = await prisma.subscription.groupBy({
    by: ['status'],
    where: { tenantId, ...(customerId ? { customerId } : {}), deletedAt: null },
    _count: { _all: true },
  })
  return rows.map((row) => ({ status: row.status, count: row._count._all }))
}

export type CurrencyTotalRow = { currency: string; issued: string; outstanding: string }

/** Issued/outstanding invoice totals per currency via a bounded groupBy. */
export async function invoiceTotalsByCurrency(
  tenantId: string
): Promise<CurrencyTotalRow[]> {
  const rows = await prisma.invoice.groupBy({
    by: ['currency'],
    where: {
      tenantId,
      status: { in: ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'] },
    },
    _sum: { totalAmount: true, amountDue: true },
  })
  return rows.map((row) => ({
    currency: row.currency.toUpperCase(),
    issued: (row._sum.totalAmount ?? 0n).toString(),
    outstanding: (row._sum.amountDue ?? 0n).toString(),
  }))
}

export type OverdueRow = { currency: string; overdue: string }

/** Overdue collectible balances per currency (due date has passed). */
export async function receivablesOverdueByCurrency(
  tenantId: string,
  asOf: number
): Promise<OverdueRow[]> {
  const rows = await prisma.invoice.groupBy({
    by: ['currency'],
    where: {
      tenantId,
      status: { in: [...COLLECTIBLE_INVOICE_STATUSES] },
      dueAt: { lt: asOf },
      amountDue: { gt: 0n },
    },
    _sum: { amountDue: true },
  })
  return rows.map((row) => ({
    currency: row.currency.toUpperCase(),
    overdue: (row._sum.amountDue ?? 0n).toString(),
  }))
}

/** Bounded workspace counts for the dashboard shell (no row loading). */
export async function dashboardCounts(tenantId: string): Promise<{
  customerCount: number
  productCount: number
  draftQuoteCount: number
}> {
  const [customerCount, productCount, draftQuoteCount] = await Promise.all([
    prisma.customer.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.quote.count({ where: { tenantId, status: 'DRAFT' } }),
  ])
  return { customerCount, productCount, draftQuoteCount }
}

/** Start of the tenant-timezone month containing `at`, as unix seconds. */
export async function monthStartEpoch(
  timezone: string,
  at: number
): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ start: unknown }>>(Prisma.sql`
    SELECT (EXTRACT(EPOCH FROM (date_trunc('month', to_timestamp(${at}) AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone}))::bigint) AS "start"
  `)
  return count(rows[0]?.start)
}

/** Latest finalized-invoice or paid-receipt instant for one customer. */
export async function customerLastSaleAt(
  tenantId: string,
  customerId: string
): Promise<number | null> {
  const rows = await prisma.$queryRaw<Array<{ lastSaleAt: unknown }>>(Prisma.sql`
    SELECT GREATEST(
      (SELECT MAX(i.issue_at)
       FROM billing_invoices AS i
       WHERE i.tenant_id = ${tenantId}
         AND i.customer_id = ${customerId}
         AND i.issue_at IS NOT NULL
         AND i.status IN ('OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'UNCOLLECTIBLE')
         AND i.billing_reason <> 'OPENING_BALANCE'),
      (SELECT MAX(s.receipt_at)
       FROM billing_sales_receipts AS s
       WHERE s.tenant_id = ${tenantId}
         AND s.customer_id = ${customerId}
         AND s.status = 'PAID')
    ) AS "lastSaleAt"
  `)
  const value = rows[0]?.lastSaleAt
  if (value === null || value === undefined) return null
  return count(value)
}

export {
  COLLECTIBLE_INVOICE_STATUSES,
  ISSUED_CREDIT_NOTE_STATUSES,
  RECEIVED_PAYMENT_STATUSES,
  SALE_INVOICE_STATUSES,
}
