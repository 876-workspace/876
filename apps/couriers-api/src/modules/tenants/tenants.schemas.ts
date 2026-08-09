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

export const tenantIdParamsSchema = z.strictObject({ id: z.string().min(1) })
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>

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
