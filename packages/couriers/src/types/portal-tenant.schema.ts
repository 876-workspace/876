import { z } from 'zod'

export const portalTenantSchema = z.object({
  object: z.literal('tenant'),
  id: z.string(),
  orgId: z.string(),
  slug: z.string(),
  name: z.string(),
  mailboxPrefix: z.string().nullable(),
  status: z.literal('ACTIVE'),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export type PortalTenant = z.infer<typeof portalTenantSchema>
export type ResolvePortalTenantParams =
  | { hostname: string; slug?: never }
  | { slug: string; hostname?: never }
