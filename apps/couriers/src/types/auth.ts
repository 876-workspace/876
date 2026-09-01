/**
 * The Couriers tenant shape consumed by the Next app.
 *
 * This is intentionally independent of the app-local Prisma model. The API
 * client returns snake-case transport data; `lib/couriers` converts it at the
 * application boundary so routing and orchestration do not depend on Prisma.
 */
export type CouriersTenant = {
  id: string
  orgId: string
  slug: string
  name: string
  mailboxPrefix: string | null
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'
  createdAt: number
  updatedAt: number
}

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

export type OrgRole = 'super-admin' | 'admin' | 'staff'
export type AppAccessStatus = 'active' | 'blocked' | 'none'

export type OrgSummary = {
  id: string
  name: string | null
  slug: string
  role: OrgRole
  logoUrl: string | null
}

export type ManageContext = {
  userId: string
  orgId: string
  orgName: string | null
  orgSlug: string | null
  orgLogoUrl: string | null
  organizations: OrgSummary[]
  tenant: CouriersTenant | null
  role: OrgRole
  accessStatus: AppAccessStatus
  currentPlanName?: string | null
}
