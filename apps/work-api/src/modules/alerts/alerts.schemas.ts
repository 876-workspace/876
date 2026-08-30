import { createWorkAlertInputSchema, updateWorkAlertInputSchema, workAlertStatusSchema } from '@876/work'
import { z } from 'zod'
export const organizationParamsSchema = z.strictObject({ organizationId: z.string().trim().min(1) })
export const alertParamsSchema = organizationParamsSchema.extend({ alertId: z.string().trim().min(1) })
export const listAlertsQuerySchema = z.strictObject({
  task_id: z.string().trim().min(1).optional(), event_id: z.string().trim().min(1).optional(), user_id: z.string().trim().min(1).optional(),
  status: workAlertStatusSchema.optional(), limit: z.coerce.number().int().min(1).max(100).default(25),
  starting_after: z.string().trim().min(1).optional(), ending_before: z.string().trim().min(1).optional(),
}).refine((q) => !(q.starting_after && q.ending_before), { message: 'Only one cursor may be provided.' })
export const createAlertBodySchema = createWorkAlertInputSchema
export const updateAlertBodySchema = updateWorkAlertInputSchema
