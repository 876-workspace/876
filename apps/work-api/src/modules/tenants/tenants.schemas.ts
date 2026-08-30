import { z } from 'zod'

export const ensureTenantBodySchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
