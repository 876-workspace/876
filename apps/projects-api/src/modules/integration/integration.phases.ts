import { z } from 'zod'

export const phaseParamsSchema = z.strictObject({
  phaseId: z.string().trim().min(1),
})
