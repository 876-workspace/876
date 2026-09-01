import countries from '@876/core/countries.json' with { type: 'json' }
import * as z from 'zod'

const COUNTRY_CODES = new Set(
  countries.map((country) => country.countryCode.toUpperCase())
)

/** Canonical country code accepted by organization provisioning. */
export const auth876BusinessCountryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase())
  .refine((value) => COUNTRY_CODES.has(value), {
    message: 'Select a supported country.',
  })

/**
 * Business sign-up creates the organization that Phase 2 routes. Country is
 * therefore required and must come from the platform country catalog rather
 * than a free-form value. More specific subdivision/jurisdiction routing is
 * added only when the signup surface has a canonical Region/jurisdiction id.
 */
export const auth876RegisterBusinessParamsSchema = z.strictObject({
  email: z.string().trim().email(),
  password: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  organizationName: z.string().trim().min(1),
  countryCode: auth876BusinessCountryCodeSchema,
})

export type RegisterBusinessParams = z.infer<
  typeof auth876RegisterBusinessParamsSchema
>
