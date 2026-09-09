import { MAX_RESOURCE_WORK_WINDOW_SECONDS } from '@876/work'
import { z } from 'zod'

export const resourceWorkParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const resourceWorkQuerySchema = z
  .strictObject({
    from: z.coerce.number().int().nonnegative(),
    to: z.coerce.number().int().nonnegative(),
    context_service: z.string().trim().min(1),
    context_resource: z.string().trim().min(1),
    context_id: z.string().trim().min(1),
  })
  .refine((value) => value.to > value.from, {
    message: 'to must be after from.',
  })
  .refine(
    (value) => value.to - value.from <= MAX_RESOURCE_WORK_WINDOW_SECONDS,
    {
      message: `Range cannot exceed ${MAX_RESOURCE_WORK_WINDOW_SECONDS} seconds.`,
    }
  )
