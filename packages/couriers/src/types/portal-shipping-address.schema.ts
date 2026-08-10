import { z } from 'zod'

export const portalShippingAddressSchema = z.object({
  object: z.literal('portal_shipping_address'),
  warehouse: z
    .object({
      id: z.string(),
      name: z.string(),
      address: z.object({
        line1: z.string(),
        line2: z.string().nullable(),
        city: z.string(),
        region_code: z.string().nullable(),
        region_name: z.string().nullable(),
        country_code: z.string(),
        postal_code: z.string().nullable(),
      }),
    })
    .nullable(),
  mailbox: z.object({ id: z.string(), number: z.string() }).nullable(),
})

export type PortalShippingAddress = z.infer<typeof portalShippingAddressSchema>
