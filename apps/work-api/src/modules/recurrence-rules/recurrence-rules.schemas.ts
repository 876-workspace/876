import {
  createWorkRecurrenceRuleInputSchema,
  updateWorkRecurrenceRuleInputSchema,
} from '@876/work'
import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const recurrenceParamsSchema = organizationParamsSchema.extend({
  ruleId: z.string().trim().min(1),
})
export const createRecurrenceBodySchema = createWorkRecurrenceRuleInputSchema
export const updateRecurrenceBodySchema = updateWorkRecurrenceRuleInputSchema
