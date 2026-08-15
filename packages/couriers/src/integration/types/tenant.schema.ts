import { z } from 'zod'

export const tenantSchema = z.object({
  object: z.literal('tenant'),
  id: z.string(),
  orgId: z.string(),
  slug: z.string(),
  name: z.string(),
  mailboxPrefix: z.string().nullable(),
  status: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export type Tenant = z.infer<typeof tenantSchema>

export const tenantListSchema = z.object({
  object: z.literal('list'),
  data: z.array(tenantSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export type TenantList = z.infer<typeof tenantListSchema>
