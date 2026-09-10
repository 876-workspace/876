import { z } from 'zod'

import {
  createWorkEventInputSchema,
  updateWorkEventInputSchema,
  workContextSchema,
  workEventSchema,
  workListSchema,
  type WorkContext,
  type WorkEventListFilter,
} from './types'

/**
 * Phase 2 Event contract.
 *
 * The foundation Event shape predated contextual embedding. Keep the original
 * schema exported for source compatibility, but all canonical Event resources
 * now use this enriched shape so CRM, Couriers, Careers, and future services
 * can link an event without a cross-database foreign key.
 */
export const workEventResourceSchema = workEventSchema.extend({
  context: workContextSchema.nullable(),
})
export type WorkEventResource = z.infer<typeof workEventResourceSchema>

export const createWorkEventResourceInputSchema = createWorkEventInputSchema
export type CreateWorkEventResourceInput = z.infer<
  typeof createWorkEventResourceInputSchema
>

export const updateWorkEventResourceInputSchema = updateWorkEventInputSchema
export type UpdateWorkEventResourceInput = z.infer<
  typeof updateWorkEventResourceInputSchema
>

export const workEventResourceListSchema = workListSchema(
  workEventResourceSchema
)

export type WorkEventResourceListFilter = WorkEventListFilter & {
  context?: WorkContext
}
