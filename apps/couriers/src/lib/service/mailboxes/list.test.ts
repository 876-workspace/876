import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Mailbox } from '@/lib/db'

type MockPrismaClient = {
  mailbox: {
    findMany: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { list } from './list'

function createMailbox(overrides: Partial<Mailbox> = {}): Mailbox {
  return {
    id: 'mbx_rsj1001',
    customerId: 'cprof_kimani',
    tenantId: 'ten_rocketship',
    number: 'RSJ1001',
    isPrimary: true,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

describe('mailboxes.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      mailbox: { findMany: vi.fn().mockResolvedValue([]) },
    }
  })

  it('scopes mailboxes to tenant and customer and puts the primary first', async () => {
    const mailboxes = [
      createMailbox(),
      createMailbox({
        id: 'mbx_rsj1002',
        number: 'RSJ1002',
        isPrimary: false,
      }),
    ]
    const findMany = mockPrismaRef.current!.mailbox.findMany
    findMany.mockResolvedValue(mailboxes)

    const result = await list({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })

    expect(result).toEqual(mailboxes)
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_rocketship',
        customerId: 'cprof_kimani',
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
  })
})
