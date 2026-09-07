import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimCommandRow: vi.fn(),
  completeCommandRow: vi.fn(),
}))

vi.mock('./command-idempotency.repository', () => ({
  claimCommand: mocks.claimCommandRow,
  completeCommand: mocks.completeCommandRow,
}))

import { claimCommand, completeCommand } from './command-idempotency.service'

const input = {
  operation: 'invoice-finalize',
  key: 'retry-key',
  requestHash: 'hash_1',
  resource: { type: 'invoice', id: 'inv_1' },
  httpStatus: 201,
  now: 100,
}

describe('command idempotency service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a newly claimed command', async () => {
    mocks.claimCommandRow.mockResolvedValue({ state: 'claimed', id: 'idem_1' })

    await expect(claimCommand({} as never, 'ten_1', input)).resolves.toEqual({
      data: { state: 'claimed', claimId: 'idem_1' },
      error: null,
    })
    expect(mocks.claimCommandRow).toHaveBeenCalledWith({} as never, 'ten_1', {
      operation: 'invoice-finalize',
      key: 'retry-key',
      requestHash: 'hash_1',
      resourceType: 'invoice',
      resourceId: 'inv_1',
      httpStatus: 201,
      createdAt: 100,
    })
  })

  it('returns the original resource for a completed same-request replay', async () => {
    mocks.claimCommandRow.mockResolvedValue({
      state: 'replayed',
      id: 'idem_1',
      resourceType: 'invoice',
      resourceId: 'inv_1',
      httpStatus: 201,
    })

    await expect(claimCommand({} as never, 'ten_1', input)).resolves.toEqual({
      data: {
        state: 'replayed',
        claimId: 'idem_1',
        resource: { type: 'invoice', id: 'inv_1' },
        httpStatus: 201,
      },
      error: null,
    })
  })

  it('rejects reuse with a different request or resource', async () => {
    mocks.claimCommandRow.mockResolvedValue({ state: 'conflict', id: 'idem_1' })

    await expect(claimCommand({} as never, 'ten_1', input)).resolves.toEqual({
      data: null,
      error: 'The idempotency key was already used with a different request.',
      status: 409,
      code: 'billing/idempotency-conflict',
    })
  })

  it('rejects a duplicate command whose first transaction is still open', async () => {
    mocks.claimCommandRow.mockResolvedValue({
      state: 'in-progress',
      id: 'idem_1',
    })

    await expect(claimCommand({} as never, 'ten_1', input)).resolves.toEqual({
      data: null,
      error: 'A request with this idempotency key is already in progress.',
      status: 409,
      code: 'billing/idempotency-conflict',
    })
  })

  it('completes the same transactional claim through the repository', async () => {
    mocks.completeCommandRow.mockResolvedValue(undefined)

    await completeCommand({} as never, 'ten_1', 'idem_1', 200)

    expect(mocks.completeCommandRow).toHaveBeenCalledWith(
      {} as never,
      'ten_1',
      'idem_1',
      200
    )
  })
})
