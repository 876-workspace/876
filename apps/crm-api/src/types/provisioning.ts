import { z } from 'zod'

const nullableShortString = z.string().trim().max(1000).nullable()

export const crmProvisionedPrioritySchema = z.strictObject({
  key: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  description: nullableShortString,
  color: z.string().trim().max(100).nullable(),
  icon: z.string().trim().max(40).nullable(),
  weight: z.number().int().min(0).max(1_000_000),
  sortOrder: z.number().int().min(0).max(1_000_000),
  isDefault: z.boolean(),
})

export const crmProvisionedCategorySchema = z.strictObject({
  key: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  description: nullableShortString,
  color: z.string().trim().max(100).nullable(),
  icon: z.string().trim().max(40).nullable(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
  defaultPriorityKey: z.string().trim().min(1).max(100).nullable(),
})

export const crmProvisionedSubcategorySchema = z.strictObject({
  key: z.string().trim().min(1).max(100),
  categoryKey: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  description: nullableShortString,
  icon: z.string().trim().max(40).nullable(),
  sortOrder: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
  defaultPriorityKey: z.string().trim().min(1).max(100).nullable(),
})

export const crmProvisioningManifestSchema = z
  .strictObject({
    object: z.literal('crm_provisioning_manifest'),
    revision: z.number().int().positive(),
    priorities: z.array(crmProvisionedPrioritySchema).min(1),
    categories: z.array(crmProvisionedCategorySchema).min(1),
    subcategories: z.array(crmProvisionedSubcategorySchema),
  })
  .superRefine((manifest, ctx) => {
    const priorityKeys = new Set(manifest.priorities.map((item) => item.key))
    const categoryKeys = new Set(manifest.categories.map((item) => item.key))
    const defaultCount = manifest.priorities.filter((item) => item.isDefault).length

    if (priorityKeys.size !== manifest.priorities.length)
      ctx.addIssue({ code: 'custom', message: 'Priority keys must be unique.' })
    if (categoryKeys.size !== manifest.categories.length)
      ctx.addIssue({ code: 'custom', message: 'Category keys must be unique.' })
    if (defaultCount !== 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Exactly one provisioned priority must be the default.',
      })

    for (const category of manifest.categories)
      if (
        category.defaultPriorityKey &&
        !priorityKeys.has(category.defaultPriorityKey)
      )
        ctx.addIssue({
          code: 'custom',
          message: `Category '${category.key}' references an unknown priority.`,
        })

    for (const subcategory of manifest.subcategories) {
      if (!categoryKeys.has(subcategory.categoryKey))
        ctx.addIssue({
          code: 'custom',
          message: `Subcategory '${subcategory.key}' references an unknown category.`,
        })
      if (
        subcategory.defaultPriorityKey &&
        !priorityKeys.has(subcategory.defaultPriorityKey)
      )
        ctx.addIssue({
          code: 'custom',
          message: `Subcategory '${subcategory.key}' references an unknown priority.`,
        })
    }
  })

export type CrmProvisioningManifest = z.infer<
  typeof crmProvisioningManifestSchema
>
