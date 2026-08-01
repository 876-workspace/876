import { DatabaseConnectionReusedError } from '@876/core/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAddBreadcrumb, mockPrismaRef } = vi.hoisted(() => ({
  mockAddBreadcrumb: vi.fn(),
  mockPrismaRef: {
    current: null as { $transaction: ReturnType<typeof vi.fn> } | null,
  },
}))

vi.mock('@sentry/nextjs', () => ({ addBreadcrumb: mockAddBreadcrumb }))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import {
  isColdStartError,
  runTransaction,
  TRANSACTION_MAX_WAIT_MS,
  TRANSACTION_TIMEOUT_MS,
} from './transaction'

/**
 * Stands in for `PrismaClientKnownRequestError`. The classifier reads `code`
 * structurally rather than by `instanceof`, so the test must not depend on the
 * generated client either — otherwise it would pass against a class the
 * bundled runtime never actually produces.
 */
class PrismaKnownRequestError extends Error {
  constructor(readonly code: string) {
    super('Prisma request failed.')
  }
}

function prismaError(code: 'P2002' | 'P2024' | 'P2028') {
  return new PrismaKnownRequestError(code)
}

describe('service.runTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = { $transaction: vi.fn() }
  })

  it('passes the documented acquisition and body limits to Prisma', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    const tx = {} as never
    transaction.mockImplementation(async (run) => run(tx))

    const result = await runTransaction(
      'branches.create',
      async () => 'created'
    )

    expect(result).toBe('created')
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: TRANSACTION_MAX_WAIT_MS,
      timeout: TRANSACTION_TIMEOUT_MS,
    })
  })

  it('returns the callback value after the first successful attempt', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    const tx = {} as never
    transaction.mockImplementation(async (run) => run(tx))

    const result = await runTransaction('branches.create', async () => ({
      id: 'br_1',
    }))

    expect(result).toEqual({ id: 'br_1' })
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('retries exactly once after a P2024 connection-acquisition error', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    transaction
      .mockRejectedValueOnce(prismaError('P2024'))
      .mockResolvedValueOnce('created')

    const result = await runTransaction(
      'branches.create',
      async () => 'ignored'
    )

    expect(result).toBe('created')
    expect(transaction).toHaveBeenCalledTimes(2)
  })

  it('records the operation label as a breadcrumb when it retries', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    transaction
      .mockRejectedValueOnce(prismaError('P2024'))
      .mockResolvedValueOnce('created')

    await runTransaction('branches.create', async () => 'ignored')

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1)
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'db',
      level: 'warning',
      message:
        'Retrying branches.create after a cold-start connection failure.',
    })
  })

  it('records no breadcrumb when the failure is not a cold start', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    transaction.mockRejectedValue(prismaError('P2002'))

    await expect(
      runTransaction('branches.create', async () => 'ignored')
    ).rejects.toThrow()
    expect(mockAddBreadcrumb).not.toHaveBeenCalled()
  })

  it('retries exactly once after a P2028 transaction API error', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    transaction
      .mockRejectedValueOnce(prismaError('P2028'))
      .mockResolvedValueOnce('created')

    const result = await runTransaction(
      'branches.create',
      async () => 'ignored'
    )

    expect(result).toBe('created')
    expect(transaction).toHaveBeenCalledTimes(2)
  })

  it('retries an error that reports a timed-out new connection', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    transaction
      .mockRejectedValueOnce(
        new Error('Timed out fetching a new connection from the pool.')
      )
      .mockResolvedValueOnce('created')

    const result = await runTransaction(
      'branches.create',
      async () => 'ignored'
    )

    expect(result).toBe('created')
    expect(transaction).toHaveBeenCalledTimes(2)
  })

  it('does not retry a unique-constraint error and rethrows it unchanged', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    const error = prismaError('P2002')
    transaction.mockRejectedValue(error)

    await expect(
      runTransaction('branches.create', async () => 'ignored')
    ).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('does not retry a reused database connection error', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    const error = new DatabaseConnectionReusedError('branch.create')
    transaction.mockRejectedValue(error)

    await expect(
      runTransaction('branches.create', async () => 'ignored')
    ).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('does not retry a plain Error and rethrows it unchanged', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    const error = new Error('connection lost')
    transaction.mockRejectedValue(error)

    await expect(
      runTransaction('branches.create', async () => 'ignored')
    ).rejects.toBe(error)
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('rethrows the second P2024 failure without a third attempt', async () => {
    const transaction = mockPrismaRef.current!.$transaction
    const firstError = prismaError('P2024')
    const secondError = prismaError('P2024')
    transaction
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)

    await expect(
      runTransaction('branches.create', async () => 'ignored')
    ).rejects.toBe(secondError)
    expect(transaction).toHaveBeenCalledTimes(2)
  })
})

describe('service.isColdStartError', () => {
  it.each([null, undefined, 'P2024', { code: 'P2024' }])(
    'returns false for the non-Error value %j',
    (error) => {
      expect(isColdStartError(error)).toBe(false)
    }
  )
})
