export interface OrgMembership {
  id: string
  role: string
  status: string
  permissions: string[]
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
    logoUrl: string | null
  }
}

export interface SessionTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  userId: string | null
  organizationId: string | null
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export interface AuthState {
  status: AuthStatus
  organizationId: string | null
  userId: string | null
}
