import 'server-only'
import { cache } from 'react'
import { getBillingWorkspace } from '@/lib/auth/app-access'
import type { AppMembership, OrgMember } from '@876/access-ui/member-types'
type ErrorValue = { code: string; message: string }
export const loadUsers = cache(async (orgId: string): Promise<{ members: OrgMember[]; error: ErrorValue | null }> => {
  const workspace = await getBillingWorkspace()
  if (!workspace) return { members: [], error: { code: 'billing/unauthorized', message: 'Unauthorized.' } }
  const result = await workspace.members.list(orgId)
  return { members: result.data?.data ?? [], error: result.error }
})
export const loadMember = cache(async (orgId: string, id: string): Promise<{ member: OrgMember | null; error: ErrorValue | null }> => {
  const result = await loadUsers(orgId)
  return { member: result.members.find((member) => member.id === id) ?? null, error: result.error }
})
export const loadMemberAppMemberships = cache(async (orgId: string, id: string): Promise<{ memberships: AppMembership[]; error: ErrorValue | null }> => {
  const workspace = await getBillingWorkspace()
  if (!workspace) return { memberships: [], error: { code: 'billing/unauthorized', message: 'Unauthorized.' } }
  const result = await workspace.appMemberships.listForMember(orgId, id)
  return { memberships: result.data?.data ?? [], error: result.error }
})
