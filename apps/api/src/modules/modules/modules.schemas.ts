import { z } from 'zod'

/**
 * Application modules — the functional areas of a product app an organization
 * can be entitled to. Not to be confused with a feature flag: a module is what
 * an org buys, a flag is what the platform rolls out
 * (.claude/rules/module-settings.md).
 */

export const MODULE_STATUSES = ['active', 'archived'] as const

/**
 * Keys are permanent identifiers — renaming one orphans every plan row and every
 * stored preference that points at it.
 */
const MODULE_KEY = /^[a-z][a-z0-9_]*$/

export const moduleSchema = z
  .object({
    object: z
      .literal('application_module')
      .meta({ description: "Always 'application_module'." }),
    id: z.string(),
    app_id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    feature_id: z.string().nullable(),
    feature_slug: z.string().nullable(),
    status: z.enum(MODULE_STATUSES),
    position: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'ApplicationModule' })

export const moduleDeletedSchema = z
  .object({
    object: z.literal('application_module'),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({ id: 'ApplicationModuleDeleted' })

export const createModuleBodySchema = z.object({
  app_id: z.string(),
  key: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1)
        .max(80)
        .regex(
          MODULE_KEY,
          'Module keys must be lowercase snake_case identifiers.'
        )
    ),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullish(),
  feature_id: z.string().nullish(),
  position: z.number().int().min(0).default(0),
})

/**
 * `description` and `feature_id` are meaningfully clearable, so they are read
 * through "was the key present" rather than "is the value non-null" — sending
 * `null` clears them, omitting them leaves them alone.
 */
export const updateModuleBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullish(),
  feature_id: z.string().nullish(),
  position: z.number().int().min(0).optional(),
  status: z.enum(MODULE_STATUSES).optional(),
})

export const listModulesQuerySchema = z.object({
  appId: z.string(),
  includeArchived: z.stringbool().default(false),
})

export const entitlementsQuerySchema = z.object({
  organizationId: z.string(),
  appId: z.string(),
})

export const moduleIdParamsSchema = z.strictObject({ module_id: z.string() })

export type ApplicationModule = z.infer<typeof moduleSchema>
export type ModuleStatus = (typeof MODULE_STATUSES)[number]
export type CreateModuleBody = z.infer<typeof createModuleBodySchema>
export type UpdateModuleBody = z.infer<typeof updateModuleBodySchema>
export type ListModulesQuery = z.infer<typeof listModulesQuerySchema>
export type EntitlementsQuery = z.infer<typeof entitlementsQuerySchema>
