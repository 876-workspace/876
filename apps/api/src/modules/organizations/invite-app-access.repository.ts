import { prisma } from '@/db/client'

export type InviteAppAccessSelectionRow = {
  id: string
  organizationId: string
  sourceAppId: string | null
  appRoleId: string | null
  orgRoleId: string | null
}

const SELECT = {
  id: true,
  organizationId: true,
  sourceAppId: true,
  appRoleId: true,
  orgRoleId: true,
} as const

export function findInviteAppAccessSelectionById(
  inviteId: string
): Promise<InviteAppAccessSelectionRow | null> {
  return prisma.inviteToken.findUnique({
    where: { id: inviteId },
    select: SELECT,
  }) as Promise<InviteAppAccessSelectionRow | null>
}

export function findInviteAppAccessSelectionByToken(
  token: string
): Promise<InviteAppAccessSelectionRow | null> {
  return prisma.inviteToken.findUnique({
    where: { token },
    select: SELECT,
  }) as Promise<InviteAppAccessSelectionRow | null>
}

export async function updateInviteAppAccessSelection(
  inviteId: string,
  selection: {
    appRoleId: string | null
    orgRoleId: string | null
    updatedAt: bigint
  }
): Promise<InviteAppAccessSelectionRow | null> {
  try {
    return (await prisma.inviteToken.update({
      where: { id: inviteId },
      data: {
        appRoleId: selection.appRoleId,
        orgRoleId: selection.orgRoleId,
        updatedAt: selection.updatedAt,
      },
      select: SELECT,
    })) as InviteAppAccessSelectionRow
  } catch {
    return null
  }
}
