/** Authorization facts for a Console operator, sourced from MC's own DB. */
export type Access = {
  id: string
  role: string
  permissions: string[]
  status: string
}

/** Access plus identity display fields hydrated from $876 for the console header. */
export type RoutingUser = Access & {
  firstName: string | null
  lastName: string | null
  email: string
  avatar: string | null
  banned: boolean
}

export type SessionUser = {
  id: string
  email: string
  accountType?: string
  firstName?: string | null
  lastName?: string | null
}

export type Signed876Session = {
  user: SessionUser
  accessToken?: string
}

export type Current876Session = Signed876Session | { user: null }

export type Session876Result<T> = T | Error

export type RoleCheckDenied = { ok: false; error: string; status: 400 | 403 }
export type RoleCheckAllowed = { ok: true }
export type RoleCheckResult = RoleCheckAllowed | RoleCheckDenied

export type RoleChangeResult = {
  userId: string
  role: string
  revoked: boolean
}
