import { z } from 'zod'

export const healthSchema = z
  .object({
    object: z.literal('health').meta({ description: "Always 'health'." }),
    status: z.literal('ok'),
    service: z.literal('@876/couriers-api'),
  })
  .meta({ id: 'Health' })

export type Health = z.infer<typeof healthSchema>

export const healthQuerySchema = z.strictObject({})
