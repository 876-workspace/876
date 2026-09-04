import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: { request: { findMany: vi.fn() } },
}))

vi.mock('../../../db/index.js', () => ({ prisma }))

const repository = await import('../requests.repository.js')

beforeEach(() => vi.clearAllMocks())

describe('requests.repository - listAcrossOrganizations', () => {
  it('returns rows from different tenants while excluding soft-deleted requests', async () => {
    const rows = [
      { id: 'req_1', tenant: { organizationId: 'org_1' } },
      { id: 'req_2', tenant: { organizationId: 'org_2' } },
    ]
    prisma.request.findMany.mockResolvedValue(rows)

    const result = await repository.listAcrossOrganizations({ limit: 25 })

    expect(result).toEqual(rows)
    expect(prisma.request.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      include: {
        priority: true,
        tenant: { select: { organizationId: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 26,
    })
  })

  it('applies status and cursor filters without adding a tenant boundary', async () => {
    prisma.request.findMany.mockResolvedValue([])

    await repository.listAcrossOrganizations({
      status: 'OPEN',
      limit: 10,
      startingAfter: 'req_1',
    })

    expect(prisma.request.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, status: 'OPEN' },
      include: {
        priority: true,
        tenant: { select: { organizationId: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 11,
      cursor: { id: 'req_1' },
      skip: 1,
    })
  })
})
