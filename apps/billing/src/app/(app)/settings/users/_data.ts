import 'server-only'
import { cache } from 'react'
import { getBillingWorkspace } from '@/lib/auth/app-access'
import { service } from '@/lib/service'
import { BillingApiError } from '@/lib/service/api'
import type { MemberView, RoleResource } from '@/types/access'
import type { AppMembership, OrgMember } from '@876/access-ui/member-types'
type ErrorValue = { code: string; message: string }
export const loadUsers = cache(
  async (
    orgId: string
  ): Promise<{ members: OrgMember[]; error: ErrorValue | null }> => {
    const workspace = await getBillingWorkspace()
    if (!workspace)
      return {
        members: [],
        error: { code: 'billing/unauthorized', message: 'Unauthorized.' },
      }
    const result = await workspace.members.list(orgId)
    return { members: result.data?.data ?? [], error: result.error }
  }
)
export const loadMember = cache(
  async (
    orgId: string,
    id: string
  ): Promise<{ member: OrgMember | null; error: ErrorValue | null }> => {
    const result = await loadUsers(orgId)
    return {
      member: result.members.find((member) => member.id === id) ?? null,
      error: result.error,
    }
  }
)
export const loadMemberAppMemberships = cache(
  async (
    orgId: string,
    id: string
  ): Promise<{ memberships: AppMembership[]; error: ErrorValue | null }> => {
    const workspace = await getBillingWorkspace()
    if (!workspace)
      return {
        memberships: [],
        error: { code: 'billing/unauthorized', message: 'Unauthorized.' },
      }
    const result = await workspace.appMemberships.listForMember(orgId, id)
    return { memberships: result.data?.data ?? [], error: result.error }
  }
)

/**
 * The finance-workspace grants behind the organization roster.
 *
 * Returned as a value rather than thrown: this sits in the same Suspense
 * boundary as the roster, and a rejection here used to blank the whole users
 * table — the roster, which had loaded fine, disappeared along with it. The
 * finance section degrades on its own instead
 * (`.claude/rules/error-handling.md`).
 */
export const loadBillingMembers = cache(
  async (
    tenantId: string
  ): Promise<{
    members: MemberView[]
    roles: RoleResource[]
    error: ErrorValue | null
  }> => {
    try {
      const [members, roles] = await Promise.all([
        service.members.list(tenantId) as Promise<MemberView[]>,
        service.roles.list(tenantId) as Promise<RoleResource[]>,
      ])

      return { members, roles, error: null }
    } catch (error) {
      const code =
        error instanceof BillingApiError ? error.code : 'billing/unavailable'
      return {
        members: [],
        roles: [],
        error: {
          code,
          message: 'Workspace roles could not be loaded.',
        },
      }
    }
  }
)
