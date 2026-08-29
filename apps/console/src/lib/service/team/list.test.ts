import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('@/lib/db', () => ({
  prisma: { member: { findMany: mocks.findMany } },
}))

import { list } from './list'

describe('team.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-02T03:04:05Z'))
    mocks.findMany.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists every grant when status is omitted', async () => {
    const result = await list()

    expect(result).toEqual([])
    expect(mocks.findMany).toHaveBeenCalledTimes(1)
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: undefined,
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('lists every grant when the options object is empty', async () => {
    await list({})

    expect(mocks.findMany).toHaveBeenCalledTimes(1)
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: undefined,
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('filters active grants and excludes expired grants', async () => {
    await list({ status: 'active' })

    expect(mocks.findMany).toHaveBeenCalledTimes(1)
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: 1893553445n } },
        ],
      },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('filters suspended grants by persisted status', async () => {
    await list({ status: 'suspended' })

    expect(mocks.findMany).toHaveBeenCalledTimes(1)
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { status: 'suspended' },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('filters expired grants by expiry timestamp', async () => {
    await list({ status: 'expired' })

    expect(mocks.findMany).toHaveBeenCalledTimes(1)
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: 1893553445n } },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('treats a grant expiring exactly now as expired', async () => {
    await list({ status: 'expired' })

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { expiresAt: { lte: 1893553445n } } })
    )
  })

  it('returns Prisma rows unchanged', async () => {
    const rows = [
      {
        userId: 'user_695d45c54a374ff0a570003e15668891',
        roleName: 'staff',
        status: 'active',
      },
    ]
    mocks.findMany.mockResolvedValue(rows)

    const result = await list({ status: 'active' })

    expect(result).toEqual(rows)
    expect(mocks.findMany).toHaveBeenCalledTimes(1)
  })

  it('always includes the role relation needed by the list UI', async () => {
    await list({ status: 'suspended' })

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { role: true } })
    )
  })
})
