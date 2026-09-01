import { z } from 'zod'

export const tenantSchema = z
  .object({
    object: z.literal('tenant'),
    id: z.string(),
    org_id: z.string(),
    slug: z.string(),
    name: z.string(),
    mailbox_prefix: z.string().nullable(),
    status: z.string(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Tenant' })

export type Tenant = z.infer<typeof tenantSchema>

export const createTenantBodySchema = z.strictObject({
  org_id: z.string().min(1),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(120),
  creator_user_id: z.string().min(1).optional(),
})
export type CreateTenantBody = z.infer<typeof createTenantBodySchema>

export const updateTenantBodySchema = z.strictObject({
  mailbox_prefix: z
    .string()
    .trim()
    .max(16)
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => /^[A-Z0-9]+$/.test(value),
      'Prefix may only contain letters and numbers.'
    )
    .nullable()
    .optional(),
})
export type UpdateTenantBody = z.infer<typeof updateTenantBodySchema>

export const tenantIdParamsSchema = z.strictObject({ id: z.string().min(1) })
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>

/** Cross-tenant admin routes keep the explicit tenant in the URL path. */
export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export type TenantParams = z.infer<typeof tenantParamsSchema>

export const tenantOrgIdParamsSchema = z.strictObject({
  orgId: z.string().min(1),
})
export type TenantOrgIdParams = z.infer<typeof tenantOrgIdParamsSchema>

export const emptyQuerySchema = z.strictObject({})

export const listTenantsQuerySchema = z
  .strictObject({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().min(1).optional(),
    ending_before: z.string().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>
