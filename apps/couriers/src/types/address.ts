import * as z from 'zod'

/**
 * A named physical location owned by one tenant.
 *
 * `regionCode` is the canonical subdivision code resolved from the platform geo
 * catalog; `regionName` is the display snapshot captured alongside it, so
 * rendering an address never requires a platform round trip. Rows migrated from
 * the legacy postal columns carry a `regionName` with no `regionCode` — they
 * are readable as-is and only require a canonical region once their geography
 * is edited.
 */
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

/** Blank optional input is absence, not an empty value. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional()

const coordinatesArePaired = {
  check: (data: { latitude?: number; longitude?: number }) =>
    (data.latitude === undefined) === (data.longitude === undefined),
  message: 'Provide both a latitude and a longitude, or neither.',
  path: ['latitude'] as const,
}

/**
 * `regionName` is deliberately absent: the client names a `regionCode` and the
 * server resolves the canonical name for it. A client-supplied display name is
 * never trusted.
 */
export const addressCreateParamsSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    line1: z.string().trim().min(1).max(200),
    line2: optionalText(200),
    city: z.string().trim().min(1).max(120),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    regionCode: z
      .string()
      .trim()
      .max(32)
      .transform((value) => (value === '' ? undefined : value.toUpperCase()))
      .optional(),
    postalCode: optionalText(32),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(coordinatesArePaired.check, {
    message: coordinatesArePaired.message,
    path: [...coordinatesArePaired.path],
  })
export type AddressCreateParams = z.input<typeof addressCreateParamsSchema>

export const addressUpdateParamsSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    line1: z.string().trim().min(1).max(200).optional(),
    line2: optionalText(200),
    city: z.string().trim().min(1).max(120).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    regionCode: z
      .string()
      .trim()
      .max(32)
      .transform((value) => (value === '' ? undefined : value.toUpperCase()))
      .optional(),
    postalCode: optionalText(32),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(coordinatesArePaired.check, {
    message: coordinatesArePaired.message,
    path: [...coordinatesArePaired.path],
  })
export type AddressUpdateParams = z.input<typeof addressUpdateParamsSchema>

export const addressListParamsSchema = z.strictObject({
  isActive: z.boolean().optional(),
  countryCode: z.string().trim().length(2).optional(),
})
export type AddressListParams = z.input<typeof addressListParamsSchema>

/**
 * How many owners reference an address. Counts only — an organization-wide
 * address list must not disclose which customers live at one.
 */
export const addressUsageSchema = z.object({
  branchCount: z.number().int(),
  warehouseCount: z.number().int(),
  customerAddressCount: z.number().int(),
})
export type AddressUsage = z.infer<typeof addressUsageSchema>

export const deletedAddressSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedAddress = z.infer<typeof deletedAddressSchema>
