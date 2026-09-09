import { z } from 'zod'

export const resourceWorkParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const resourceWorkQuerySchema = z
  .strictObject({
    from: z.coerce.number().int(),
    to: z.coerce.number().int(),
    context_service: z.string().trim().min(1),
    context_resource: z.string().trim().min(1),
    context_id: z.string().trim().min(1),
  })
  .refine((value) => value.to > value.from, {
    message: 'to must be after from.',
  })
