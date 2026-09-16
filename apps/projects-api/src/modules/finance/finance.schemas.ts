import { z } from 'zod'

export const BILLING_METHODS = [
  'non-billable',
  'fixed-fee',
  'time-and-materials',
  'hourly',
  'phase-based',
] as const

export const BUDGET_SCOPES = ['project', 'milestone', 'user'] as const

export const RATE_SCOPES = ['project', 'user', 'project-user'] as const

export const billingMethodSchema = z.enum(BILLING_METHODS)
export const budgetScopeSchema = z.enum(BUDGET_SCOPES)
export const rateScopeSchema = z.enum(RATE_SCOPES)

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'currency must be a three-letter ISO code')

const unixSecondsSchema = z.number().int().nonnegative()

export const financeProjectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const budgetParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  budgetId: z.string().trim().min(1),
})

export const rateParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  rateId: z.string().trim().min(1),
})

export const putBillingBodySchema = z
  .strictObject({
    billingMethod: billingMethodSchema,
    currency: currencySchema.optional(),
    billingCustomerId: z.string().trim().min(1).nullable().optional(),
    fixedFeeAmount: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (data) =>
      data.billingMethod !== 'fixed-fee' ||
      typeof data.fixedFeeAmount === 'number',
    {
      message: 'fixedFeeAmount is required when billingMethod is fixed-fee',
      path: ['fixedFeeAmount'],
    }
  )

export type PutBillingBody = z.infer<typeof putBillingBodySchema>

const budgetPeriodSchema = z
  .strictObject({
    periodStart: unixSecondsSchema.nullable().optional(),
    periodEnd: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.periodStart === undefined ||
      data.periodStart === null ||
      data.periodEnd === undefined ||
      data.periodEnd === null ||
      data.periodEnd >= data.periodStart,
    { message: 'periodEnd must be at or after periodStart' }
  )

export const createBudgetBodySchema = z
  .strictObject({
    scope: budgetScopeSchema,
    milestoneId: z.string().trim().min(1).nullable().optional(),
    userId: z.string().trim().min(1).nullable().optional(),
    amountMinor: z.number().int().positive().nullable().optional(),
    hours: z.number().int().positive().nullable().optional(),
    thresholdPercent: z.number().int().min(1).max(100).default(80),
    periodStart: unixSecondsSchema.nullable().optional(),
    periodEnd: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      ((data.amountMinor ?? null) !== null) !== ((data.hours ?? null) !== null),
    { message: 'Exactly one of amountMinor or hours must be set' }
  )
  .refine(
    (data) =>
      data.periodStart === undefined ||
      data.periodStart === null ||
      data.periodEnd === undefined ||
      data.periodEnd === null ||
      data.periodEnd >= data.periodStart,
    { message: 'periodEnd must be at or after periodStart' }
  )
  .refine(
    (data) =>
      (data.scope === 'milestone' && (data.milestoneId ?? null) !== null) ||
      (data.scope !== 'milestone' && (data.milestoneId ?? null) === null),
    {
      message: 'milestoneId is required exactly when scope is milestone',
      path: ['milestoneId'],
    }
  )
  .refine(
    (data) =>
      (data.scope === 'user' && (data.userId ?? null) !== null) ||
      (data.scope !== 'user' && (data.userId ?? null) === null),
    {
      message: 'userId is required exactly when scope is user',
      path: ['userId'],
    }
  )

export type CreateBudgetBody = z.infer<typeof createBudgetBodySchema>

export const updateBudgetBodySchema = budgetPeriodSchema.extend({
  amountMinor: z.number().int().positive().nullable().optional(),
  hours: z.number().int().positive().nullable().optional(),
  thresholdPercent: z.number().int().min(1).max(100).optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  userId: z.string().trim().min(1).nullable().optional(),
})

export type UpdateBudgetBody = z.infer<typeof updateBudgetBodySchema>

export const createRateBodySchema = z
  .strictObject({
    scope: rateScopeSchema,
    userId: z.string().trim().min(1).nullable().optional(),
    billRateMinor: z.number().int().min(0),
    costRateMinor: z.number().int().min(0),
    currency: currencySchema.default('USD'),
    effectiveFrom: unixSecondsSchema.nullable().optional(),
    effectiveTo: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.effectiveFrom === undefined ||
      data.effectiveFrom === null ||
      data.effectiveTo === undefined ||
      data.effectiveTo === null ||
      data.effectiveTo >= data.effectiveFrom,
    { message: 'effectiveTo must be at or after effectiveFrom' }
  )
  .refine(
    (data) =>
      (data.scope === 'project' && (data.userId ?? null) === null) ||
      (data.scope !== 'project' && (data.userId ?? null) !== null),
    {
      message: 'userId is required exactly when scope is not project',
      path: ['userId'],
    }
  )

export type CreateRateBody = z.infer<typeof createRateBodySchema>

export const updateRateBodySchema = z
  .strictObject({
    userId: z.string().trim().min(1).nullable().optional(),
    billRateMinor: z.number().int().min(0).optional(),
    costRateMinor: z.number().int().min(0).optional(),
    currency: currencySchema.optional(),
    effectiveFrom: unixSecondsSchema.nullable().optional(),
    effectiveTo: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.effectiveFrom === undefined ||
      data.effectiveFrom === null ||
      data.effectiveTo === undefined ||
      data.effectiveTo === null ||
      data.effectiveTo >= data.effectiveFrom,
    { message: 'effectiveTo must be at or after effectiveFrom' }
  )

export type UpdateRateBody = z.infer<typeof updateRateBodySchema>

const periodQuerySchema = z
  .strictObject({
    from: z.coerce.number().int().nonnegative(),
    to: z.coerce.number().int().nonnegative(),
  })
  .refine((data) => data.to >= data.from, {
    message: 'Query param to must be at or after from',
  })

export const financialSummaryQuerySchema = periodQuerySchema
export type FinancialSummaryQuery = z.infer<typeof financialSummaryQuerySchema>

export const createInvoiceDraftBodySchema = z
  .strictObject({
    from: unixSecondsSchema,
    to: unixSecondsSchema,
  })
  .refine((data) => data.to >= data.from, {
    message: 'to must be at or after from',
  })

export type CreateInvoiceDraftBody = z.infer<
  typeof createInvoiceDraftBodySchema
>
