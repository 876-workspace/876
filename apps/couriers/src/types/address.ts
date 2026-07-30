import { z } from 'zod'

export const addressViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  regionCode: z.string().nullable(),
  regionName: z.string().nullable(),
  countryCode: z.string(),
  postalCode: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export type AddressView = z.infer<typeof addressViewSchema>

export const addressFieldsSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().length(2).transform(v => v.toUpperCase()),
  regionCode: z.string().trim().max(32).optional(),
  postalCode: z.string().trim().max(32).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().default(true).optional(),
}).refine(d => !((d.latitude == null) !== (d.longitude == null)), {
  message: 'Latitude and longitude must both be provided or both omitted.',
  path: ['latitude']
})

export type AddressFields = z.infer<typeof addressFieldsSchema>
