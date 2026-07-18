import * as z from 'zod'

// Cash drawer shifts are operational Couriers data. The selected deposit
// account and every collected payment remain authoritative in Billing.

export const cashSessionStatusSchema = z.enum(['OPEN', 'CLOSED', 'RECONCILED'])
export type CashSessionStatus = z.infer<typeof cashSessionStatusSchema>

export const cashSessionViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  staffMemberId: z.string(),
  billingDepositAccountId: z.string(),
  currencyCode: z.string().length(3),
  status: cashSessionStatusSchema,
  openingBalance: z.number().int(),
  expectedClosingBalance: z.number().int().nullable(),
  actualClosingBalance: z.number().int().nullable(),
  variance: z.number().int().nullable(),
  openedAt: z.number().int(),
  closedAt: z.number().int().nullable(),
  reconciledAt: z.number().int().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CashSessionView = z.infer<typeof cashSessionViewSchema>

export const cashSessionCreateParamsSchema = z.strictObject({
  staffMemberId: z.string(),
  billingDepositAccountId: z.string(),
  currencyCode: z.string().length(3),
  openingBalance: z.number().int(),
  openedAt: z.number().int(),
  notes: z.string().optional(),
})
export type CashSessionCreateParams = z.input<
  typeof cashSessionCreateParamsSchema
>

export const cashSessionUpdateParamsSchema = z.strictObject({
  status: cashSessionStatusSchema.optional(),
  expectedClosingBalance: z.number().int().optional(),
  actualClosingBalance: z.number().int().optional(),
  variance: z.number().int().optional(),
  closedAt: z.number().int().optional(),
  reconciledAt: z.number().int().optional(),
  notes: z.string().optional(),
})
export type CashSessionUpdateParams = z.input<
  typeof cashSessionUpdateParamsSchema
>

export const cashSessionRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type CashSessionRetrieveParams = z.input<
  typeof cashSessionRetrieveParamsSchema
>

export const cashSessionListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  staffMemberId: z.string().optional(),
  billingDepositAccountId: z.string().optional(),
  status: cashSessionStatusSchema.optional(),
})
export type CashSessionListParams = z.input<typeof cashSessionListParamsSchema>

export const cashSessionPaymentViewSchema = z.object({
  id: z.string(),
  cashSessionId: z.string(),
  billingPaymentId: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type CashSessionPaymentView = z.infer<
  typeof cashSessionPaymentViewSchema
>
