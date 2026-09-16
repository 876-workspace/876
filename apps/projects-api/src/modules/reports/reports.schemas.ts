import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const capacityParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  capacityId: z.string().trim().min(1),
})

const unixSecondsSchema = z.number().int().nonnegative()

const formatSchema = z.enum(['json', 'csv']).default('json')

const periodQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().nonnegative(),
  format: formatSchema.optional(),
})

export const workReportQuerySchema = z.strictObject({
  projectId: z.string().trim().min(1).optional(),
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().nonnegative(),
  format: formatSchema.optional(),
})
export type WorkReportQuery = z.infer<typeof workReportQuerySchema>

export const healthReportQuerySchema = z.strictObject({
  format: formatSchema.optional(),
})
export type HealthReportQuery = z.infer<typeof healthReportQuerySchema>

export const TIME_REPORT_GROUPS = ['project', 'user', 'issue'] as const
export const timeReportGroupSchema = z.enum(TIME_REPORT_GROUPS)
export type TimeReportGroup = z.infer<typeof timeReportGroupSchema>

export const timeReportQuerySchema = z.strictObject({
  groupBy: timeReportGroupSchema,
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().nonnegative(),
  projectId: z.string().trim().min(1).optional(),
  format: formatSchema.optional(),
})
export type TimeReportQuery = z.infer<typeof timeReportQuerySchema>

export const budgetVarianceQuerySchema = periodQuerySchema
export type BudgetVarianceQuery = z.infer<typeof budgetVarianceQuerySchema>

export const workloadQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative(),
  to: z.coerce.number().int().nonnegative(),
  projectId: z.string().trim().min(1).optional(),
  format: formatSchema.optional(),
})
export type WorkloadQuery = z.infer<typeof workloadQuerySchema>

export type ReportPeriod = { from: number; to: number }

export function toReportPeriod(query: {
  from: number
  to: number
}): ReportPeriod | null {
  if (query.to <= query.from) return null
  return { from: query.from, to: query.to }
}

export const listCapacitiesQuerySchema = z.strictObject({
  userId: z.string().trim().min(1).optional(),
})
export type ListCapacitiesQuery = z.infer<typeof listCapacitiesQuerySchema>

const capacityRangeSchema = z
  .strictObject({
    effectiveFrom: unixSecondsSchema,
    effectiveTo: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.effectiveTo === undefined ||
      data.effectiveTo === null ||
      data.effectiveTo > data.effectiveFrom,
    { message: 'effectiveTo must be after effectiveFrom' }
  )

export const createCapacityBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  minutesPerWeek: z.number().int().positive().max(10080),
  effectiveFrom: unixSecondsSchema,
  effectiveTo: unixSecondsSchema.nullable().optional(),
}).refine(
  (data) =>
    data.effectiveTo === undefined ||
    data.effectiveTo === null ||
    data.effectiveTo > data.effectiveFrom,
  { message: 'effectiveTo must be after effectiveFrom' }
)
export type CreateCapacityBody = z.infer<typeof createCapacityBodySchema>

export const updateCapacityBodySchema = z
  .strictObject({
    minutesPerWeek: z.number().int().positive().max(10080).optional(),
    effectiveFrom: unixSecondsSchema.optional(),
    effectiveTo: unixSecondsSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.minutesPerWeek !== undefined ||
      data.effectiveFrom !== undefined ||
      data.effectiveTo !== undefined,
    { message: 'At least one field must be provided for update' }
  )
export type UpdateCapacityBody = z.infer<typeof updateCapacityBodySchema>

export const capacityRange = capacityRangeSchema
export type CapacityRange = z.infer<typeof capacityRangeSchema>
