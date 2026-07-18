import type { Tenant } from '@/lib/db'

/** A read result that is either the 876 session value or a thrown error. */
export type Session876Result<T> = T | Error

export type SessionUser = {
  id: string
  email: string
  accountType?: string
  realm?: 'consumer' | 'enterprise'
  orgId?: string | null
  firstName?: string | null
  lastName?: string | null
  emailVerified?: boolean
  avatar?: string | null
  username?: string | null
}

export type Signed876Session = {
  user: SessionUser
  accessToken?: string
}

export type Current876Session = Signed876Session | { user: null }

export type OrgRole = 'owner' | 'admin' | 'member'
export type AppAccessStatus = 'active' | 'blocked' | 'none'

export type OrgSummary = {
  id: string
  name: string | null
  slug: string
  role: OrgRole
}

export type ManageContext = {
  userId: string
  orgId: string
  orgName: string | null
  orgSlug: string | null
  organizations: OrgSummary[]
  tenant: Tenant | null
  role: OrgRole
  accessStatus: AppAccessStatus
}
