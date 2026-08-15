import { z } from 'zod'

const IdSchema = z.string().trim().min(1).max(191)
const unixTimestampSchema = z.number().int().nonnegative()
const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase())
const minorAmountSchema = z
  .union([
    z.number().int().nonnegative().safe(),
    z.string().regex(/^(0|[1-9]\d*)$/),
  ])
  .transform((value) => BigInt(value))

export type ServiceResult<T> = Promise<
  { data: T; error: null } | { data: null; error: string; status?: number }
>

export const CouponCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(160),
    code: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    productId: IdSchema.nullable().optional(),
    percentOff: z.number().positive().max(100).nullable().optional(),
    amountOff: minorAmountSchema
      .refine(
        (value) => value > 0n,
        'Discount amount must be greater than zero.'
      )
      .nullable()
      .optional(),
    currency: currencyCodeSchema.nullable().optional(),
    duration: z.enum(['ONCE', 'REPEATING', 'FOREVER']),
    durationInCycles: z.number().int().positive().nullable().optional(),
    redeemBy: unixTimestampSchema.nullable().optional(),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    maxRedemptionsPerCustomer: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),
    discountPreference: z
      .enum(['INVOICE_LEVEL', 'ITEM_LEVEL'])
      .default('INVOICE_LEVEL'),
    appliesToAllPlans: z.boolean().default(true),
    appliesToAllRecurringAddons: z.boolean().default(true),
    appliesToAllOneTimeAddons: z.boolean().default(true),
    eligibleForAllCustomers: z.boolean().default(true),
    planIds: z.array(IdSchema).max(1000).default([]),
    addonIds: z.array(IdSchema).max(1000).default([]),
    customerIds: z.array(IdSchema).max(1000).default([]),
    currencyAmounts: z
      .array(
        z.strictObject({
          currency: currencyCodeSchema,
          amountOff: minorAmountSchema.refine(
            (value) => value > 0n,
            'Discount amount must be greater than zero.'
          ),
        })
      )
      .max(100)
      .default([]),
  })
  .superRefine((value, context) => {
    const percentage =
      value.percentOff !== null && value.percentOff !== undefined
    const amount =
      (value.amountOff !== null && value.amountOff !== undefined) ||
      value.currencyAmounts.length > 0
    if (percentage === amount)
      context.addIssue({
        code: 'custom',
        message: 'Choose either a percentage or amount discount.',
        path: ['percentOff'],
      })
    if (
      value.amountOff !== null &&
      value.amountOff !== undefined &&
      !value.currency
    )
      context.addIssue({
        code: 'custom',
        message: 'Amount discounts require a currency.',
        path: ['currency'],
      })
    if (value.duration === 'REPEATING' && !value.durationInCycles)
      context.addIssue({
        code: 'custom',
        message: 'Repeating discounts require a cycle count.',
        path: ['durationInCycles'],
      })
    if (!value.eligibleForAllCustomers && value.customerIds.length === 0)
      context.addIssue({
        code: 'custom',
        message: 'Select at least one eligible customer.',
        path: ['customerIds'],
      })
    if (
      new Set(value.currencyAmounts.map((entry) => entry.currency)).size !==
      value.currencyAmounts.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Each currency can have only one discount amount.',
        path: ['currencyAmounts'],
      })
  })

export const CouponUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  redeemBy: unixTimestampSchema.nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const PromotionCodeCreateSchema = z.strictObject({
  couponId: IdSchema,
  code: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((value) => value.toUpperCase()),
  customerId: IdSchema.nullable().optional(),
  expiresAt: unixTimestampSchema.nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
})

export type CouponCreateParams = z.infer<typeof CouponCreateSchema>
export type CouponCreateInput = z.input<typeof CouponCreateSchema>
export type CouponUpdateParams = z.infer<typeof CouponUpdateSchema>
export type CouponUpdateInput = z.input<typeof CouponUpdateSchema>
export type PromotionCodeCreateParams = z.infer<
  typeof PromotionCodeCreateSchema
>
export type PromotionCodeCreateInput = z.input<typeof PromotionCodeCreateSchema>
