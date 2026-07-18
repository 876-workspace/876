import { z } from 'zod'

import { IdSchema } from './common'

export const SalespersonCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  email: z.email().nullable().optional(),
  externalReference: IdSchema.nullable().optional(),
})

export const SalespersonUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  email: z.email().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type SalespersonCreateParams = z.infer<typeof SalespersonCreateSchema>
export type SalespersonCreateInput = z.input<typeof SalespersonCreateSchema>
export type SalespersonUpdateParams = z.infer<typeof SalespersonUpdateSchema>
