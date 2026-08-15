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

export type InvoiceOrganization = {
  id: string
  name: string
  slug: string | null
  role: string
}

export type InvoiceContext = {
  userId: string
  orgId: string
  orgName: string
  orgSlug: string | null
  role: string
  organizations: InvoiceOrganization[]
  accessStatus: AccessStatus
}

/**
 * Why there is (or is not) an acting context. `unavailable` means the platform
 * lookup itself failed — never treat it as "this account has no organization".
 */
export type InvoiceContextResult =
  | { status: 'ok'; context: InvoiceContext }
  | { status: 'no-organization' }
  | { status: 'signed-out' }
  | { status: 'unavailable' }
