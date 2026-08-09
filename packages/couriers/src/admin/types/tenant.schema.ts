import { z } from 'zod'

export const tenantSchema = z.object({
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

export type Tenant = z.infer<typeof tenantSchema>

export const tenantListSchema = z.object({
  object: z.literal('list'),
  data: z.array(tenantSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type TenantList = z.infer<typeof tenantListSchema>
