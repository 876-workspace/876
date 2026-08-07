import { z } from 'zod'

export const healthSchema = z
  .object({
    object: z
      .literal('health')
      .meta({ description: "Object discriminator. Always 'health'." }),
    status: z.literal('ok').meta({ description: 'Service health status.' }),
    service: z
      .literal('@876/api')
      .meta({ description: 'Service package name.' }),
  })
  .meta({ id: 'Health' })

export type Health = z.infer<typeof healthSchema>
