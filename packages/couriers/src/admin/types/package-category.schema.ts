import { z } from 'zod'

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const packageCategorySchema = z.object({
  object: z.literal('package_category'),
  id: z.string(),
  tenant_id: z.string().nullable(),
  provisioning_key: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.number().int(),
  updated_at: z.number().int(),
  deleted_at: z.number().int().nullable(),
})

export const packageCategoryListSchema = z.object({
  object: z.literal('list'),
  data: z.array(packageCategorySchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const createPackageCategoryBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export const updatePackageCategoryBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export const provisionedPackageCategorySchema = z.strictObject({
  key: slugSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean().default(true),
})

export const reconcilePackageCategoriesBodySchema = z.strictObject({
  revision: z.number().int().min(1),
  categories: z.array(provisionedPackageCategorySchema).min(1).max(100),
})

export const packageCategoryReconciliationSchema = z.object({
  object: z.literal('package_category_reconciliation'),
  revision: z.number().int().min(1),
  reconciled: z.number().int().min(0),
})

export const deletedPackageCategorySchema = z.object({
  object: z.literal('package_category'),
  id: z.string(),
  deleted: z.literal(true),
})

export type PackageCategory = z.infer<typeof packageCategorySchema>
export type PackageCategoryList = z.infer<typeof packageCategoryListSchema>
export type CreatePackageCategoryBody = z.input<
  typeof createPackageCategoryBodySchema
>
export type UpdatePackageCategoryBody = z.input<
  typeof updatePackageCategoryBodySchema
>
export type ProvisionedPackageCategory = z.input<
  typeof provisionedPackageCategorySchema
>
export type ReconcilePackageCategoriesBody = z.input<
  typeof reconcilePackageCategoriesBodySchema
>
export type PackageCategoryReconciliation = z.infer<
  typeof packageCategoryReconciliationSchema
>
export type DeletedPackageCategory = z.infer<typeof deletedPackageCategorySchema>
export type ListPackageCategoriesParams = {
  is_active?: boolean
  limit?: number
  starting_after?: string
  ending_before?: string
}
