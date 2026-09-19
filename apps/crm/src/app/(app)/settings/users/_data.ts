import 'server-only'

import { cache } from 'react'
import { getWorkspace } from '@/lib/clients/workspace'

import type { AppMembership, OrgMember } from './_lib/types'

type ErrorValue = { code: string; message: string }

export const loadUsers = cache(
  async (
    orgId: string
  ): Promise<{ members: OrgMember[]; error: ErrorValue | null }> => {
    const workspace = await getWorkspace()
    const result = await workspace.members.list(orgId)
    return { members: result.data?.data ?? [], error: result.error }
  }
)

export const loadMember = cache(
  async (
    orgId: string,
    membershipId: string
  ): Promise<{ member: OrgMember | null; error: ErrorValue | null }> => {
    const { members, error } = await loadUsers(orgId)

    return {
      member:
        members.find((candidate) => candidate.id === membershipId) ?? null,
      error,
    }
  }
)

export const loadMemberAppMemberships = cache(
  async (
    orgId: string,
    membershipId: string
  ): Promise<{ memberships: AppMembership[]; error: ErrorValue | null }> => {
    const workspace = await getWorkspace()
    const result = await workspace.appMemberships.listForMember(
      orgId,
      membershipId
    )
    return { memberships: result.data?.data ?? [], error: result.error }
  }
)
