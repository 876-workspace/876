import { z } from 'zod'

export const portalTenantSchema = z.object({
  object: z.literal('tenant'),
  id: z.string(),
  org_id: z.string(),
  slug: z.string(),
  name: z.string(),
  mailbox_prefix: z.string().nullable(),
  status: z.literal('ACTIVE'),
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export type PortalTenant = z.infer<typeof portalTenantSchema>
export type ResolvePortalTenantParams =
  | { hostname: string; slug?: never }
  | { slug: string; hostname?: never }
