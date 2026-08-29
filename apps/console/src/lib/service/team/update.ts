import { prisma } from '@/lib/db'

import {
  validateTeamGrant,
  type TeamGrantFields,
  type TeamServiceResult,
} from './validation'

type UpdateTeamGrant = Partial<TeamGrantFields> & {
  roleName?: string
  status?: string
}

type UpdatedMember = Awaited<ReturnType<typeof prisma.member.update>>

/** Update an existing Console grant while preserving affiliation invariants. */
export async function update(
  userId: string,
  input: UpdateTeamGrant
): Promise<TeamServiceResult<UpdatedMember>> {
  const current = await prisma.member.findUnique({ where: { userId } })
  if (!current) {
    return {
      data: null,
      error: {
        code: 'team/member-not-found',
        message: 'Console access grant was not found.',
      },
    }
  }

  const resultingRoleName = input.roleName ?? current.roleName
  const validated = validateTeamGrant(
    {
      affiliation:
        input.affiliation ??
        (current.affiliation as TeamGrantFields['affiliation']),
      title: input.title !== undefined ? input.title : current.title,
      expiresAt:
        input.expiresAt !== undefined ? input.expiresAt : current.expiresAt,
      justification:
        input.justification !== undefined
          ? input.justification
          : current.justification,
      invitedBy:
        input.invitedBy !== undefined ? input.invitedBy : current.invitedBy,
    },
    resultingRoleName
  )
  if (validated.error) return validated

  const data = await prisma.member.update({
    where: { userId },
    data: {
      ...(input.roleName !== undefined ? { roleName: input.roleName } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...validated.data,
    },
  })

  return { data, error: null }
}
