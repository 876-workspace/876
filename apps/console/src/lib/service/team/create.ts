import { prisma } from '@/lib/db'

import {
  validateTeamGrant,
  type TeamGrantFields,
  type TeamServiceResult,
} from './validation'

type CreateTeamGrant = Partial<TeamGrantFields> & { status?: string }

type CreatedMember = Awaited<ReturnType<typeof prisma.member.create>>

/** Grant a user Console access after validating affiliation policy. */
export async function create(
  userId: string,
  roleName: string,
  grant: CreateTeamGrant = {}
): Promise<TeamServiceResult<CreatedMember>> {
  const validated = validateTeamGrant(grant)
  if (validated.error) return validated

  const data = await prisma.member.create({
    data: {
      userId,
      roleName,
      status: grant.status ?? 'active',
      ...validated.data,
    },
  })

  return { data, error: null }
}
