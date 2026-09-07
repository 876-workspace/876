import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateId: vi.fn(() => 'idem_new'),
}))

vi.mock('@/platform/ids', () => ({ generateId: mocks.generateId }))

import { claimCommand, completeCommand } from './command-idempotency.repository'

const params = {
  operation: 'invoice-finalize',
  key: 'retry-key',
  requestHash: 'hash_1',
  resourceType: 'invoice',
  resourceId: 'inv_1',
  httpStatus: 201,
  createdAt: 100,
}

function transaction(options: {
  created?: number
  row?: {
    id: string
    requestHash: string
    resourceType: string | null
    resourceId: string | null
    httpStatus: number | null
    completedAt: number | null
  } | null
  completed?: number
}) {
  const createMany = vi.fn().mockResolvedValue({ count: options.created ?? 0 })
  const findFirst = vi.fn().mockResolvedValue(options.row ?? null)
  const updateMany = vi.fn().mockResolvedValue({ count: options.completed ?? 1 })
  return {
    tx: {
      commandIdempotencyKey: { createMany, findFirst, updateMany },
    } as never,
    createMany,
    findFirst,
    updateMany,
  }
}

function matchingRow(completedAt: number | null) {
  return {
    id: 'idem_1',
    requestHash: 'hash_1',
    resourceType: 'invoice',
    resourceId: 'inv_1',
    httpStatus: 201,
    completedAt,
  }
}

describe('command idempotency repository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('claims with skipDuplicates so a unique-key race does not abort the transaction', async () => {
    const { tx, createMany } = transaction({
      created: 1,
      row: matchingRow(null),
    })

    await expect(claimCommand(tx, 'ten_1', params)).resolves.toEqual({
      state: 'claimed',
      id: 'idem_1',
    })
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'idem_new',
          tenantId: 'ten_1',
          operation: 'invoice-finalize',
          key: 'retry-key',
          requestHash: 'hash_1',
          resourceType: 'invoice',
          resourceId: 'inv_1',
        }),
      ],
      skipDuplicates: true,
    })
  })

  it('replays only a completed row with the same request and resource', async () => {
    const { tx } = transaction({ created: 0, row: matchingRow(150) })

    await expect(claimCommand(tx, 'ten_1', params)).resolves.toEqual({
      state: 'replayed',
      id: 'idem_1',
      resourceType: 'invoice',
      resourceId: 'inv_1',
      httpStatus: 201,
    })
  })

  it('reports an in-progress same-request claim before completion', async () => {
    const { tx } = transaction({ created: 0, row: matchingRow(null) })

    await expect(claimCommand(tx, 'ten_1', params)).resolves.toEqual({
      state: 'in-progress',
      id: 'idem_1',
    })
  })

  it('conflicts when the key resolves to a different canonical request', async () => {
    const { tx } = transaction({
      created: 0,
      row: { ...matchingRow(150), requestHash: 'hash_other' },
    })

    await expect(claimCommand(tx, 'ten_1', params)).resolves.toEqual({
      state: 'conflict',
      id: 'idem_1',
    })
  })

  it('fails closed when completing anything other than one open claim', async () => {
    const { tx, updateMany } = transaction({ completed: 0 })

    await expect(completeCommand(tx, 'ten_1', 'idem_1', 200)).rejects.toThrow(
      'The command idempotency claim could not be completed.'
    )
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'idem_1', tenantId: 'ten_1', completedAt: null },
      data: { completedAt: 200 },
    })
  })
})
