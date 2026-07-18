import * as z from 'zod'

export const branchViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  street1: z.string(),
  street2: z.string().nullable(),
  city: z.string(),
  parish: z.string().nullable(),
  country: z.string(),
  phone: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type BranchView = z.infer<typeof branchViewSchema>

export const branchCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  parish: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})
export type BranchCreateParams = z.input<typeof branchCreateParamsSchema>

export const branchUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  street1: z.string().min(1).optional(),
  street2: z.string().optional(),
  city: z.string().min(1).optional(),
  parish: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
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

export const deletedBranchSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedBranch = z.infer<typeof deletedBranchSchema>
