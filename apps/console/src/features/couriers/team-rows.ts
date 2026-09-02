import type { TeamMember } from '@876/couriers/admin'

/**
 * A Couriers team member as an operator reads one.
 *
 * The membership carries only a `user_id`; the person behind it belongs to the
 * organization directory, so the name and email come from one members lookup
 * for the whole page rather than a retrieve per row.
 */
export interface CouriersTeamRow {
  id: string
  userId: string
  name: string | null
  email: string | null
  roleName: string
  /** `admin`/`staff` for a system role, null for a tenant-defined one. */
  roleSystemKey: string | null
  status: string
  createdAt: number
}

export interface DirectoryMember {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

export function toTeamRows(
  members: readonly TeamMember[],
  directory: readonly DirectoryMember[]
): CouriersTeamRow[] {
  const byUserId = new Map(directory.map((member) => [member.user_id, member]))

  return members.map((member) => {
    const person = byUserId.get(member.user_id)
    const name = person
      ? [person.first_name, person.last_name].filter(Boolean).join(' ')
      : ''

    return {
      id: member.id,
      userId: member.user_id,
      name: name.length > 0 ? name : null,
      email: person?.email ?? null,
      roleName: member.role_name,
      roleSystemKey: member.role_system_key,
      status: member.status,
      createdAt: member.created_at,
    }
  })
}
