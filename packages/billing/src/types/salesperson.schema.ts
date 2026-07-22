import { z } from 'zod'

import type { Salesperson } from './salesperson'
import { createdResourceSchema, listSchema } from './common.schema'

/**
 * The schema for a created salesperson response.
 */
export const SalespersonCreatedSchema = createdResourceSchema('salesperson')

/**
 * The schema for a salesperson resource.
 */
export const SalespersonSchema = z.object({
  object: z.literal('salesperson'),
  id: z.string().min(1),
  name: z.string(),
  email: z.string().nullable(),
  externalReference: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Salesperson>

/**
 * The schema for a paginated list of salespeople.
 */
export const SalespersonListSchema = listSchema(SalespersonSchema)
