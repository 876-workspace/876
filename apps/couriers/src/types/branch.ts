import * as z from 'zod'

import {
  addressCreateParamsSchema,
  addressUpdateParamsSchema,
  addressViewSchema,
} from './address'

/**
 * A branch is an operational location, not an address. Its name, phone, default
 * and active state, settings, assigned customers, routed packages and staff all
 * belong to the branch; the address is one property of it.
 */
export const branchViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  addressId: z.string(),
  orgLocationId: z.string().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  address: addressViewSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type BranchView = z.infer<typeof branchViewSchema>

export const branchCreateParamsSchema = z.strictObject({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressCreateParamsSchema,
})
export type BranchCreateParams = z.input<typeof branchCreateParamsSchema>

/** `tenantId`, `addressId`, and `orgLocationId` are never client-controlled. */
export const branchUpdateParamsSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressUpdateParamsSchema.optional(),
})
export type BranchUpdateParams = z.input<typeof branchUpdateParamsSchema>

export const branchRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type BranchRetrieveParams = z.input<typeof branchRetrieveParamsSchema>

export const branchListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type BranchListParams = z.input<typeof branchListParamsSchema>

export const branchSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type BranchSearchParams = z.input<typeof branchSearchParamsSchema>

/**
 * The organization address a default branch is seeded from. Sourced from the
 * core organization profile, so every field is optional there and may be absent
 * here. `regionId` is the core region reference; the seeder resolves it to a
 * canonical region code rather than inventing one from the display name.
 */
export interface DefaultBranchAddress {
  line1?: string | null
  line2?: string | null
  city?: string | null
  regionId?: string | null
  regionCode?: string | null
  countryCode?: string | null
  postalCode?: string | null
  phone?: string | null
}

export const deletedBranchSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedBranch = z.infer<typeof deletedBranchSchema>
