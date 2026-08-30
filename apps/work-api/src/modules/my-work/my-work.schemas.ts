import { z } from 'zod'

export const myWorkParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const myWorkQuerySchema = z
  .strictObject({
    from: z.coerce.number().int(),
    to: z.coerce.number().int(),
    user_id: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.to > value.from, {
    message: 'to must be after from.',
  })
