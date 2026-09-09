import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../db/index.js', () => ({
  prisma: {
    workTask: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '../../db/index.js'
import * as repository from './tasks.repository.js'

describe('tasks repository context filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.workTask.findMany).mockResolvedValue([])
  })

  it('matches either the compatibility context or any canonical task link', async () => {
    const result = await repository.list('work_tenant_123', {
      contextService: 'crm',
      contextResource: 'request',
      contextId: 'req_123',
      limit: 25,
    })

    expect(result).toEqual([])
    expect(prisma.workTask.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.workTask.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'work_tenant_123',
        deletedAt: null,
        OR: [
          {
            contextService: 'crm',
            contextResource: 'request',
            contextId: 'req_123',
          },
          {
            links: {
              some: {
                service: 'crm',
                resource: 'request',
                externalId: 'req_123',
              },
            },
          },
        ],
      },
      include: {
        links: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        assignments: {
          orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 26,
    })
  })

  it('does not add a context predicate when the triple is absent', async () => {
    const result = await repository.list('work_tenant_123', { limit: 25 })

    expect(result).toEqual([])
    expect(prisma.workTask.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.workTask.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'work_tenant_123',
        deletedAt: null,
      },
      include: {
        links: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        assignments: {
          orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 26,
    })
  })
})
