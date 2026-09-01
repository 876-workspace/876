import { z } from 'zod'

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

export type OrgRole = 'super-admin' | 'admin' | 'staff'
export type AccessStatus = 'active' | 'trialing' | 'blocked' | 'none'

export type CrmOrganization = {
  id: string
  name: string
  slug: string | null
  role: OrgRole
}

export type CrmContext = {
  userId: string
  orgId: string
  orgName: string
  orgSlug: string | null
  role: OrgRole
  organizations: CrmOrganization[]
  accessStatus: AccessStatus
}

export type CrmContextResult =
  | { status: 'ok'; context: CrmContext }
  | { status: 'no-organization' }
  | { status: 'signed-out' }
  | { status: 'unavailable' }

export const switchOrganizationInputSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export type SwitchOrganizationInput = z.infer<
  typeof switchOrganizationInputSchema
>
