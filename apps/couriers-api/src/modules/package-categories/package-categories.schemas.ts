import { z } from 'zod'

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const queryBooleanSchema = z.enum(['true', 'false']).transform((value) =>
  value === 'true'
)

export const packageCategorySchema = z
  .object({
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
  .meta({ id: 'PackageCategory' })

export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})

export const packageCategoryParamsSchema = tenantParamsSchema.extend({
  id: z.string().min(1),
})

export const listPackageCategoriesQuerySchema = z
  .strictObject({
    is_active: queryBooleanSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    starting_after: z.string().min(1).optional(),
    ending_before: z.string().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
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

export const packageCategoryReconciliationSchema = z
  .object({
    object: z.literal('package_category_reconciliation'),
    revision: z.number().int().min(1),
    reconciled: z.number().int().min(0),
  })
  .meta({ id: 'PackageCategoryReconciliation' })

export type PackageCategory = z.infer<typeof packageCategorySchema>
export type TenantParams = z.infer<typeof tenantParamsSchema>
export type PackageCategoryParams = z.infer<typeof packageCategoryParamsSchema>
export type ListPackageCategoriesQuery = z.infer<
  typeof listPackageCategoriesQuerySchema
>
export type CreatePackageCategoryBody = z.infer<
  typeof createPackageCategoryBodySchema
>
export type UpdatePackageCategoryBody = z.infer<
  typeof updatePackageCategoryBodySchema
>
export type ProvisionedPackageCategory = z.infer<
  typeof provisionedPackageCategorySchema
>
export type ReconcilePackageCategoriesBody = z.infer<
  typeof reconcilePackageCategoriesBodySchema
>
export type PackageCategoryReconciliation = z.infer<
  typeof packageCategoryReconciliationSchema
>
