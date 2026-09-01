export type TeamAffiliation = 'staff' | 'contractor' | 'external'

export type TeamGrantFields = {
  affiliation: TeamAffiliation
  title: string | null
  expiresAt: bigint | null
  justification: string | null
  invitedBy: string | null
}

export type TeamServiceError = {
  code:
    | 'team/member-not-found'
    | 'team/invalid-affiliation'
    | 'team/expiry-required'
    | 'team/expiry-invalid'
    | 'team/justification-required'
    | 'team/staff-title-not-allowed'
    | 'team/role-not-allowed-for-affiliation'
  message: string
}

export type TeamServiceResult<T> =
  { data: T; error: null } | { data: null; error: TeamServiceError }

const AFFILIATIONS: readonly TeamAffiliation[] = [
  'staff',
  'contractor',
  'external',
]

const STAFF_ONLY_ROLES = new Set(['super_admin'])

export function validateTeamGrant(
  input: Partial<TeamGrantFields>,
  roleName: string,
  nowSeconds = BigInt(Math.floor(Date.now() / 1000))
): TeamServiceResult<TeamGrantFields> {
  const affiliation = input.affiliation ?? 'staff'
  if (!AFFILIATIONS.includes(affiliation))
    return {
      data: null,
      error: {
        code: 'team/invalid-affiliation',
        message: 'Console affiliation must be staff, contractor, or external.',
      },
    }

  if (affiliation !== 'staff' && STAFF_ONLY_ROLES.has(roleName))
    return {
      data: null,
      error: {
        code: 'team/role-not-allowed-for-affiliation',
        message: `Role "${roleName}" is not allowed for affiliation "${affiliation}".`,
      },
    }

  const title = input.title?.trim() || null
  const justification = input.justification?.trim() || null
  const expiresAt = input.expiresAt ?? null
  const invitedBy = input.invitedBy?.trim() || null

  if (affiliation === 'staff' && title)
    return {
      data: null,
      error: {
        code: 'team/staff-title-not-allowed',
        message: 'Staff positions are resolved from the employee profile.',
      },
    }

  if (affiliation !== 'staff') {
    if (expiresAt === null)
      return {
        data: null,
        error: {
          code: 'team/expiry-required',
          message: 'Contractor and external Console grants require an expiry.',
        },
      }

    if (expiresAt <= nowSeconds)
      return {
        data: null,
        error: {
          code: 'team/expiry-invalid',
          message: 'Console grant expiry must be in the future.',
        },
      }

    if (!justification)
      return {
        data: null,
        error: {
          code: 'team/justification-required',
          message:
            'Contractor and external Console grants require a justification.',
        },
      }
  }

  return {
    data: { affiliation, title, expiresAt, justification, invitedBy },
    error: null,
  }
}
