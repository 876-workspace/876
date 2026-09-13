import 'server-only'
import { redirect } from 'next/navigation'
import { getCommerceContextResult } from './context'

export type CommerceAccess =
  | 'signed-out'
  | 'wrong-account'
  | 'no-organization'
  | 'admin-without-entitlement'
  | 'member-without-entitlement'
  | 'blocked'
  | 'entitled'
export function resolveCommerceAccess(input: {
  signedIn: boolean
  enterpriseRealm: boolean
  hasOrganization: boolean
  isAdmin: boolean
  accessStatus: 'active' | 'trialing' | 'blocked' | 'none'
}): CommerceAccess {
  if (!input.signedIn) return 'signed-out'
  if (!input.enterpriseRealm) return 'wrong-account'
  if (!input.hasOrganization) return 'no-organization'
  if (input.accessStatus === 'active' || input.accessStatus === 'trialing')
    return 'entitled'
  if (input.accessStatus === 'blocked') return 'blocked'
  return input.isAdmin
    ? 'admin-without-entitlement'
    : 'member-without-entitlement'
}
export async function requireCommerceSession(): Promise<void> {
  const result = await getCommerceContextResult()
  if (result.status === 'signed-out') redirect('/login')
}

export function redirectForCommerceAccess(access: CommerceAccess): void {
  if (access === 'signed-out') redirect('/login')
  if (access === 'wrong-account') redirect('/wrong-account')
  if (access === 'no-organization') redirect('/onboarding')
  // The protected layout only sends an org-without-access viewer to
  // onboarding. That route is the one authority for blocked and role policy.
  if (
    access === 'admin-without-entitlement' ||
    access === 'member-without-entitlement' ||
    access === 'blocked'
  )
    redirect('/onboarding')
}
