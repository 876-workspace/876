import type { AccessContext } from '@876/core/access'

export type ProjectsAccessContextOutcome =
  | { status: 'ok'; context: AccessContext }
  | { status: 'unavailable'; code: string }

export type ApiContext =
  | { response: Response; orgId?: undefined; userId?: undefined }
  | { response: null; orgId: string; userId: string }

export type CrmAccessViewer = {
  membershipId: string
  userId: string
  permissions: string[]
  canReadMembers: boolean
  canManageAppAccess: boolean
}

export type CrmAccessOutcome =
  | { status: 'ok'; viewer: CrmAccessViewer }
  | { status: 'unavailable'; code: string }

export type PortalAccess = {
  orgId: string
  userId: string
}

export type OnboardingCompletion = {
  object: 'onboarding_completion'
  organization_id: string
  access_status: 'active'
}
