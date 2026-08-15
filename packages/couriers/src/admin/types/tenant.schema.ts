import { z } from 'zod'

export const tenantSchema = z.object({
  object: z.literal('tenant'),
  id: z.string(),
  orgId: z.string(),
  slug: z.string(),
  name: z.string(),
  mailboxPrefix: z.string().nullable(),
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export type Tenant = z.infer<typeof tenantSchema>

export const createTenantBodySchema = z.strictObject({
  orgId: z.string().min(1),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(120),
  ownerUserId: z.string().min(1).optional(),
})

export type CreateTenantBody = z.input<typeof createTenantBodySchema>

export const updateTenantBodySchema = z.strictObject({
  mailboxPrefix: z
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
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export type TenantList = z.infer<typeof tenantListSchema>
