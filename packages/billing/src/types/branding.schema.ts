import { brandingSchema, brandingUpdateSchema } from '@876/core/branding'
import { z } from 'zod'
import type { Branding } from './branding'

export const brandingUpdateBodySchema = brandingUpdateSchema
export const brandingResourceSchema = z.strictObject({
  object: z.literal('branding'),
  ...brandingSchema.shape,
  updatedAt: z.number().int().nullable(),
}) satisfies z.ZodType<Branding>
