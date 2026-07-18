import * as z from 'zod'

export const packageCategoryViewSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type PackageCategoryView = z.infer<typeof packageCategoryViewSchema>

export const packageCategoryCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type PackageCategoryCreateParams = z.input<
  typeof packageCategoryCreateParamsSchema
>

export const packageCategoryUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type PackageCategoryUpdateParams = z.input<
  typeof packageCategoryUpdateParamsSchema
>

export const packageCategoryRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type PackageCategoryRetrieveParams = z.input<
  typeof packageCategoryRetrieveParamsSchema
>

export const packageCategoryListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  tenantId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})
export type PackageCategoryListParams = z.input<
  typeof packageCategoryListParamsSchema
>

export const packageCategorySearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type PackageCategorySearchParams = z.input<
  typeof packageCategorySearchParamsSchema
>

export const deletedPackageCategorySchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedPackageCategory = z.infer<
  typeof deletedPackageCategorySchema
>
