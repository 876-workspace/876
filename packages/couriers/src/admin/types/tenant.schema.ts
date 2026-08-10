import { z } from 'zod'

export const tenantSchema = z.object({
  object: z.literal('tenant'),
  id: z.string(),
  org_id: z.string(),
  slug: z.string(),
  name: z.string(),
  mailbox_prefix: z.string().nullable(),
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export type Tenant = z.infer<typeof tenantSchema>

export const createTenantBodySchema = z.strictObject({
  org_id: z.string().min(1),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(120),
  owner_user_id: z.string().min(1).optional(),
})

export type CreateTenantBody = z.input<typeof createTenantBodySchema>

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

export type UpdateTenantBody = z.input<typeof updateTenantBodySchema>

export const tenantListSchema = z.object({
  object: z.literal('list'),
  data: z.array(tenantSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type TenantList = z.infer<typeof tenantListSchema>
