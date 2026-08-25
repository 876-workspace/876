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
export type AccessStatus = 'active' | 'trialing' | 'blocked' | 'none'

export type CrmOrganization = {
  id: string
  name: string
  slug: string | null
  role: string
}

export type CrmContext = {
  userId: string
  orgId: string
  orgName: string
  orgSlug: string | null
  role: string
  organizations: CrmOrganization[]
  accessStatus: AccessStatus
}

export type CrmContextResult =
  | { status: 'ok'; context: CrmContext }
  | { status: 'no-organization' }
  | { status: 'signed-out' }
  | { status: 'unavailable' }
