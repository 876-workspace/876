import { z } from 'zod'

import type { Tenant } from '@/lib/db'
import type { MemberAccess, Permission } from './access'

export type SessionUser = {
  id: string
  email: string
  accountType?: string
  orgId?: string | null
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
}

export type Signed876Session = {
  user: SessionUser
  accessToken?: string
}

export type Current876Session = Signed876Session | { user: null }

export type OrgRole = 'owner' | 'admin' | 'member'
export type AccessStatus = 'active' | 'blocked' | 'none'

export type BillingOrganization = {
  id: string
  name: string | null
  slug: string
  role: OrgRole
}

export type Context = {
  userId: string
  orgId: string
  orgName: string | null
  orgSlug: string | null
  role: OrgRole
  organizations: BillingOrganization[]
  accessStatus: AccessStatus
  tenant: Tenant | null
  access: MemberAccess | null
  permissions: Permission[]
}

export const switchOrganizationInputSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export type SwitchOrganizationInput = z.infer<
  typeof switchOrganizationInputSchema
>

export type SwitchOrganizationResult = { ok: true }
