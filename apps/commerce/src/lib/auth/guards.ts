import 'server-only'
import { redirect } from 'next/navigation'
import { getCommerceContextResult } from './context'

export type CommerceAccess =
  | 'signed-out'
  | 'no-organization'
  | 'admin-without-entitlement'
  | 'member-without-entitlement'
  | 'entitled'
export function resolveCommerceAccess(input: {
  signedIn: boolean
  hasOrganization: boolean
  isAdmin: boolean
  entitled: boolean
}): CommerceAccess {
  if (!input.signedIn) return 'signed-out'
  if (!input.hasOrganization) return 'no-organization'
  if (input.entitled) return 'entitled'
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
  if (access === 'no-organization' || access === 'admin-without-entitlement')
    redirect('/onboarding')
  if (access === 'member-without-entitlement') redirect('/no-access')
}
