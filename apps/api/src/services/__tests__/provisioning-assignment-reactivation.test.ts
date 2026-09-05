import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    appAssignment: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/db/client', () => ({
  prisma,
}))

const { assignApp } = await import('../provisioning.repository')

const NOW = 1785000000n

describe('provisioning assignment reactivation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears revocation metadata without overwriting the existing app role', async () => {
    await assignApp({
      id: 'asg_new',
      organizationId: 'org_1',
      userId: 'user_1',
      appId: 'app_projects',
      appRoleId: 'role_mapped_for_new_assignment',
      assignedBy: 'user_operator',
      now: NOW,
    })

    expect(prisma.appAssignment.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.appAssignment.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_userId_appId: {
          organizationId: 'org_1',
          userId: 'user_1',
          appId: 'app_projects',
        },
      },
      create: {
        id: 'asg_new',
        organizationId: 'org_1',
        userId: 'user_1',
        appId: 'app_projects',
        appRoleId: 'role_mapped_for_new_assignment',
        status: 'active',
        assignedBy: 'user_operator',
        createdAt: NOW,
        updatedAt: NOW,
      },
      update: {
        status: 'active',
        assignedBy: 'user_operator',
        revokedAt: null,
        revokedBy: null,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: NOW,
      },
    })

    const call = prisma.appAssignment.upsert.mock.calls[0]?.[0]
    expect(call?.update).not.toHaveProperty('appRoleId')
  })
})
