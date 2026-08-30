import { platform } from '@/lib/services/platform'
import 'server-only'

import type { AdminEmployeeProfile } from '@876/admin'

import { $876 } from '@/lib/876'
import { service } from '@/lib/service'
import type { TeamGrantStatus } from '@/lib/service/team/list'

export type TeamListRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string | null
  avatar: string | null
  position: string | null
  affiliation: string
  role: string
  permissions?: string[]
  status?: string
  createdAt?: number
  expiresAt: number | null
  resolved: boolean
}

export type TeamListData = {
  rows: TeamListRow[]
  staffPositionsUnavailable: boolean
}

type StaffProfiles = {
  profiles: AdminEmployeeProfile[]
  unavailable: boolean
}

async function loadStaffProfiles(
  organizationId: string
): Promise<StaffProfiles> {
  try {
    const result = await $876.employees.admin.list(organizationId)
    return {
      profiles: result.data?.data ?? [],
      unavailable: Boolean(result.error),
    }
  } catch {
    return { profiles: [], unavailable: true }
  }
}

export function buildStaffPositionMap(
  profiles: AdminEmployeeProfile[]
): Map<string, string> {
  const positions = new Map<string, string>()
  for (const profile of profiles) {
    if (profile.user_id && profile.job_title)
      positions.set(profile.user_id, profile.job_title)
  }
  return positions
}

export function resolveTeamPosition(
  affiliation: string,
  userId: string,
  grantTitle: string | null,
  staffPositions: ReadonlyMap<string, string>
): string | null {
  if (affiliation === 'staff') return staffPositions.get(userId) ?? null
  return grantTitle
}

export async function loadTeamListData(
  status?: TeamGrantStatus
): Promise<TeamListData> {
  const staffOrganizationId = process.env.CONSOLE_STAFF_ORGANIZATION_ID
  const staffProfilesPromise = staffOrganizationId
    ? loadStaffProfiles(staffOrganizationId)
    : Promise.resolve<StaffProfiles>({ profiles: [], unavailable: false })

  const grants = await service.team.list({ status })
  const ids = grants.map((grant) => grant.userId)
  const identityPromise =
    ids.length > 0
      ? platform.users.list({ ids, limit: ids.length })
      : Promise.resolve(null)

  const [identityResult, staffProfiles] = await Promise.all([
    identityPromise,
    staffProfilesPromise,
  ])
  const identities = identityResult?.data?.data ?? []
  const identityById = new Map(
    identities.map((identity) => [identity.id, identity])
  )
  const staffPositions = buildStaffPositionMap(staffProfiles.profiles)

  return {
    staffPositionsUnavailable: staffProfiles.unavailable,
    rows: grants.map((grant) => {
      const identity = identityById.get(grant.userId)
      return {
        id: grant.userId,
        firstName: identity?.first_name ?? '',
        lastName: identity?.last_name ?? '',
        email: identity?.email ?? '',
        username: identity?.username ?? null,
        avatar: identity?.avatar ?? null,
        position: resolveTeamPosition(
          grant.affiliation,
          grant.userId,
          grant.title,
          staffPositions
        ),
        affiliation: grant.affiliation,
        role: grant.roleName,
        permissions: grant.role?.permissions ?? [],
        status: grant.status,
        createdAt: Math.floor(grant.createdAt.getTime() / 1000),
        expiresAt: grant.expiresAt === null ? null : Number(grant.expiresAt),
        resolved: Boolean(identity),
      }
    }),
  }
}
