import { z } from 'zod'

const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Use a three-letter currency code.')
  .transform((value) => value.toUpperCase())

const minorAmountSchema = z
  .union([
    z.number().int().nonnegative().safe(),
    z.string().regex(/^(0|[1-9]\d*)$/, 'Use a non-negative integer amount.'),
  ])
  .transform((value) => BigInt(value))

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional()

export const SalesOrderStatusSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'processing',
  'completed',
  'canceled',
])

export const SalesOrderPaymentStatusSchema = z.enum([
  'unpaid',
  'partially-paid',
  'paid',
  'partially-refunded',
  'refunded',
])

export const SalesOrderFulfillmentStatusSchema = z.enum([
  'unfulfilled',
  'partially-fulfilled',
  'fulfilled',
])

export const SalesOrderLineInputSchema = z.strictObject({
  itemId: z.string().min(1).nullable().optional(),
  variantId: z.string().min(1).nullable().optional(),
  priceId: z.string().min(1).nullable().optional(),
  description: nullableText(2_000),
  quantity: z.number().int().min(1).max(1_000_000),
  unitAmount: minorAmountSchema.nullable().optional(),
  taxAmount: minorAmountSchema.optional(),
  discountAmount: minorAmountSchema.optional(),
})

export const SalesOrderCreateSchema = z.strictObject({
  customerId: z.string().min(1),
  number: z.string().trim().min(1).max(64).optional(),
  currency: currencyCodeSchema,
  priceListId: z.string().min(1).nullable().optional(),
  orderedAt: z.number().int().nonnegative().nullable().optional(),
  notes: nullableText(20_000),
  terms: nullableText(20_000),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  lines: z.array(SalesOrderLineInputSchema).min(1).max(500),
})

export const SalesOrderUpdateSchema = z
  .strictObject({
    customerId: z.string().min(1).optional(),
    number: z.string().trim().min(1).max(64).optional(),
    currency: currencyCodeSchema.optional(),
    priceListId: z.string().min(1).nullable().optional(),
    orderedAt: z.number().int().nonnegative().nullable().optional(),
    notes: nullableText(20_000),
    terms: nullableText(20_000),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    lines: z.array(SalesOrderLineInputSchema).min(1).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const SalesOrderListQuerySchema = z.strictObject({
  status: SalesOrderStatusSchema.optional(),
  paymentStatus: SalesOrderPaymentStatusSchema.optional(),
  fulfillmentStatus: SalesOrderFulfillmentStatusSchema.optional(),
  customerId: z.string().min(1).optional(),
})

export type SalesOrderStatus = z.infer<typeof SalesOrderStatusSchema>
export type SalesOrderPaymentStatus = z.infer<
  typeof SalesOrderPaymentStatusSchema
>
export type SalesOrderFulfillmentStatus = z.infer<
  typeof SalesOrderFulfillmentStatusSchema
>
export type SalesOrderLineInput = z.infer<typeof SalesOrderLineInputSchema>
export type SalesOrderCreateBody = z.infer<typeof SalesOrderCreateSchema>
export type SalesOrderUpdateBody = z.infer<typeof SalesOrderUpdateSchema>
export type SalesOrderListQuery = z.infer<typeof SalesOrderListQuerySchema>
