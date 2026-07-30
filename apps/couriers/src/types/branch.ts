import * as z from 'zod'
import { addressViewSchema, addressFieldsSchema } from './address'

export const branchViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  addressId: z.string(),
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
  name: z.string().min(1),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressFieldsSchema,
})
export type BranchCreateParams = z.input<typeof branchCreateParamsSchema>

export const branchUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  address: addressFieldsSchema.partial().optional(),
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
 * The organization address a default branch is seeded from. Sourced from the core
 * organization profile, so every field is optional there and may be absent here.
 */
export interface DefaultBranchAddress {
  line1?: string | null
  street2?: string | null
  city?: string | null
  region?: string | null
  regionId?: string | null
  country?: string | null
  phone?: string | null
}

export const deletedBranchSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedBranch = z.infer<typeof deletedBranchSchema>
