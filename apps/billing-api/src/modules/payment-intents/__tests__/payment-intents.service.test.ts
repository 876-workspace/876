import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    paymentIntent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentMode: { findFirst: vi.fn() },
    bankAccount: { findFirst: vi.fn() },
    paymentAttempt: { create: vi.fn() },
    payment: { create: vi.fn() },
    $transaction: vi.fn(),
  } as unknown as never,
}))

vi.mock('@/db/client', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('../payment-intents.repository', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    paymentIntentsDb: mockPrisma,
  }
})

vi.mock('@/modules/documents', () => ({
  nextDocumentNumber: vi.fn().mockResolvedValue('PAY-0001'),
}))

const TENANT = 'ten_1'
const NOW = 1_700_000_000

function intentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_1',
    tenantId: TENANT,
    customerId: 'cus_1',
    amount: 1000n,
    currency: 'USD',
    status: 'REQUIRES_CONFIRMATION',
    captureMethod: 'AUTOMATIC',
    confirmationMethod: 'AUTOMATIC',
    paymentMethodId: 'pm_1',
    paymentMethod: {
      id: 'pm_1',
      type: 'MANUAL',
      displayLabel: 'Bank Transfer',
      billingDetails: null,
      card: null,
      bankAccount: null,
      manual: { method: 'bank_transfer', displayName: 'Bank' },
    },
    invoiceId: null,
    subscriptionId: null,
    paymentMethodTypes: [],
    description: null,
    receiptEmail: null,
    metadata: null,
    idempotencyKey: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function buildMocks() {
  mockPrisma.paymentIntent.findFirst.mockReset()
  mockPrisma.paymentIntent.findMany.mockReset()
  mockPrisma.paymentIntent.create.mockReset()
  mockPrisma.paymentIntent.update.mockReset()
  mockPrisma.paymentMode.findFirst.mockReset()
  mockPrisma.bankAccount.findFirst.mockReset()
  mockPrisma.$transaction.mockReset()

  mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
  mockPrisma.paymentIntent.findMany.mockResolvedValue([])
  mockPrisma.paymentIntent.create.mockImplementation(
    ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...intentRow(), ...data })
  )
  mockPrisma.paymentIntent.update.mockImplementation(
    ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...intentRow(), ...data })
  )
  mockPrisma.paymentMode.findFirst.mockResolvedValue({
    id: 'mode_1',
    isActive: true,
    isDefault: true,
  })
  mockPrisma.bankAccount.findFirst.mockResolvedValue({
    id: 'acct_1',
    isActive: true,
    currency: 'USD',
  })
  // Held on the outside so a test can assert what was written inside the
  // transaction, not merely that one was opened.
  txMocks = {
    paymentAttempt: { create: vi.fn().mockResolvedValue({}) },
    payment: { create: vi.fn().mockResolvedValue({}) },
    paymentIntent: {
      update: vi.fn().mockResolvedValue(intentRow({ status: 'SUCCEEDED' })),
    },
  }
  mockPrisma.$transaction.mockImplementation(
    async (fn: (tx: unknown) => unknown) => fn(txMocks)
  )
}

type TxMocks = {
  paymentAttempt: { create: ReturnType<typeof vi.fn> }
  payment: { create: ReturnType<typeof vi.fn> }
  paymentIntent: { update: ReturnType<typeof vi.fn> }
}
let txMocks: TxMocks

let service: (typeof import('../payment-intents.service'))['paymentIntentsService']

beforeEach(async () => {
  vi.clearAllMocks()
  buildMocks()
  vi.resetModules()
  // re-mock after reset
  vi.doMock('@/db/client', () => ({
    get prisma() {
      return mockPrisma
    },
  }))
  vi.doMock(
    '../payment-intents.repository',
    async (importOriginal: () => Promise<unknown>) => {
      const actual = (await importOriginal()) as Record<string, unknown>
      return { ...actual, paymentIntentsDb: mockPrisma }
    }
  )
  vi.doMock('@/modules/documents', () => ({
    nextDocumentNumber: vi.fn().mockResolvedValue('PAY-0001'),
  }))
  const mod = await import('../payment-intents.service')
  service = mod.paymentIntentsService
})

describe('paymentIntentsService.list', () => {
  it('returns a list envelope with has_more false when not full', async () => {
    mockPrisma.paymentIntent.findMany.mockResolvedValue([
      intentRow(),
      intentRow({ id: 'pi_2' }),
    ])
    const result = await service.list(TENANT, { limit: 25 } as unknown as never)
    expect(result.object).toBe('list')
    expect(result.data).toHaveLength(2)
    expect(result.has_more).toBe(false)
    expect(result.url).toBe('/api/v1/payment-intents')
  })

  it('sets has_more true when page is full', async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      intentRow({ id: `pi_${i}` })
    )
    mockPrisma.paymentIntent.findMany.mockResolvedValue(rows)
    const result = await service.list(TENANT, { limit: 10 } as unknown as never)
    expect(result.has_more).toBe(true)
  })

  it('filters by customerId and status', async () => {
    await service.list(TENANT, {
      customerId: 'cus_1',
      status: 'SUCCEEDED',
    } as unknown as never)
    expect(mockPrisma.paymentIntent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'cus_1',
          status: 'SUCCEEDED',
        }),
      })
    )
  })

  it('defaults limit to 25 when not provided', async () => {
    await service.list(TENANT, {} as unknown as never)
    expect(mockPrisma.paymentIntent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25 })
    )
  })
})

describe('paymentIntentsService.get', () => {
  it('returns the intent when found', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(intentRow())
    const result = await service.get(TENANT, 'pi_1')
    expect(result).toEqual(
      expect.objectContaining({ object: 'payment_intent', id: 'pi_1' })
    )
  })

  it('throws 404 when not found', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
    await expect(service.get(TENANT, 'pi_gone')).rejects.toMatchObject({
      code: 'payment-intent/not-found',
      httpStatus: 404,
    })
  })
})

describe('paymentIntentsService.create', () => {
  it('creates with REQUIRES_PAYMENT_METHOD when no paymentMethodId', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
    const { intent, replayed } = await service.create(TENANT, {
      customerId: 'cus_1',
      amount: 5000n,
      currency: 'usd',
    } as unknown as never)

    expect(replayed).toBe(false)
    expect(intent).toBeDefined()
    const data = mockPrisma.paymentIntent.create.mock.calls[0]?.[0].data
    expect(data.status).toBe('REQUIRES_PAYMENT_METHOD')
    expect(data.currency).toBe('usd')
  })

  it('creates with REQUIRES_CONFIRMATION when paymentMethodId is provided', async () => {
    const { intent } = await service.create(TENANT, {
      customerId: 'cus_1',
      amount: 5000n,
      currency: 'USD',
      paymentMethodId: 'pm_1',
    } as unknown as never)
    const data = mockPrisma.paymentIntent.create.mock.calls[0]?.[0].data
    expect(data.status).toBe('REQUIRES_CONFIRMATION')
    expect(intent).toBeDefined()
  })

  it('replays an existing intent when idempotencyKey matches', async () => {
    const existing = intentRow({ idempotencyKey: 'key_123' })
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(existing)

    const { intent, replayed } = await service.create(
      TENANT,
      {
        customerId: 'cus_1',
        amount: 1000n,
        currency: 'USD',
      } as unknown as never,
      'key_123'
    )

    expect(replayed).toBe(true)
    expect(intent).toEqual(expect.objectContaining({ id: 'pi_1' }))
    expect(mockPrisma.paymentIntent.create).not.toHaveBeenCalled()
  })

  it('handles P2002 race on create by replaying', async () => {
    mockPrisma.paymentIntent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(intentRow() as Record<string, unknown>)
    mockPrisma.paymentIntent.create.mockRejectedValue({ code: 'P2002' })

    const { replayed } = await service.create(
      TENANT,
      {
        customerId: 'cus_1',
        amount: 1000n,
        currency: 'USD',
      } as unknown as never,
      'key_race'
    )

    expect(replayed).toBe(true)
  })

  it('rethrows non-P2002 errors', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
    mockPrisma.paymentIntent.create.mockRejectedValue(new Error('boom'))
    await expect(
      service.create(TENANT, {
        customerId: 'cus_1',
        amount: 1000n,
        currency: 'USD',
      } as unknown as never)
    ).rejects.toThrow('boom')
  })

  it('stores metadata and description when provided', async () => {
    await service.create(TENANT, {
      customerId: 'cus_1',
      amount: 1000n,
      currency: 'USD',
      description: 'Test payment',
      metadata: { order: '123' },
    } as unknown as never)
    const data = mockPrisma.paymentIntent.create.mock.calls[0]?.[0].data
    expect(data.description).toBe('Test payment')
    expect(data.metadata).toEqual({ order: '123' })
  })

  it('uppercases currency via schema but service preserves provided case handling', async () => {
    await service.create(TENANT, {
      customerId: 'cus_1',
      amount: 1000n,
      currency: 'usd',
    } as unknown as never)
    const data = mockPrisma.paymentIntent.create.mock.calls[0]?.[0].data
    expect(data.currency).toBe('usd')
  })
})

describe('paymentIntentsService.confirm', () => {
  it('succeeds for MANUAL method and creates payment and attempt', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(intentRow())
    const result = await service.confirm(TENANT, 'pi_1')
    expect(result).toEqual(
      expect.objectContaining({ object: 'payment_intent' })
    )
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('records the whole amount as unapplied, since nothing is allocated yet', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(intentRow())

    await service.confirm(TENANT, 'pi_1')

    const payment = txMocks.payment.create.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(txMocks.payment.create).toHaveBeenCalledTimes(1)
    expect(payment.amount).toBe(payment.unappliedAmount)
    expect(payment.status).toBe('SUCCEEDED')
  })

  it('snapshots only the display metadata of the payment method', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(intentRow())

    await service.confirm(TENANT, 'pi_1')

    const payment = txMocks.payment.create.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    const snapshot = payment.paymentMethodSnapshot as Record<string, unknown>

    expect(Object.keys(snapshot).sort()).toEqual([
      'bankAccount',
      'card',
      'displayLabel',
      'manual',
      'type',
    ])
    expect(JSON.stringify(snapshot)).not.toContain('sealed')
    expect(JSON.stringify(snapshot)).not.toContain('credential')
  })

  it('throws 409 when status is not REQUIRES_CONFIRMATION', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'SUCCEEDED' })
    )
    await expect(service.confirm(TENANT, 'pi_1')).rejects.toMatchObject({
      code: 'payment-intent/invalid-transition',
      httpStatus: 409,
    })
  })

  it('transitions to PROCESSING and throws 503 for non-manual methods', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({
        paymentMethod: { type: 'CARD', displayLabel: 'visa' },
      }) as Record<string, unknown>
    )
    await expect(service.confirm(TENANT, 'pi_1')).rejects.toMatchObject({
      code: 'payment/provider-unavailable',
      httpStatus: 503,
    })
    expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING' }),
      })
    )
  })

  it('throws 422 when payment mode or bank account is missing', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(intentRow())
    mockPrisma.paymentMode.findFirst.mockResolvedValue(null)
    await expect(service.confirm(TENANT, 'pi_1')).rejects.toMatchObject({
      code: 'payment-intent/manual-settlement-unavailable',
      httpStatus: 422,
    })
    mockPrisma.paymentMode.findFirst.mockResolvedValue({ id: 'mode_1' })
    mockPrisma.bankAccount.findFirst.mockResolvedValue(null)
    await expect(service.confirm(TENANT, 'pi_1')).rejects.toMatchObject({
      code: 'payment-intent/manual-settlement-unavailable',
      httpStatus: 422,
    })
  })

  it('throws not-found when intent does not exist', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
    await expect(service.confirm(TENANT, 'pi_gone')).rejects.toMatchObject({
      code: 'payment-intent/not-found',
      httpStatus: 404,
    })
  })

  it('throws when payment method is null even with correct status', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ paymentMethod: null })
    )
    await expect(service.confirm(TENANT, 'pi_1')).rejects.toMatchObject({
      httpStatus: 409,
    })
  })
})

describe('paymentIntentsService.capture', () => {
  it('captures a REQUIRES_CAPTURE intent', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'REQUIRES_CAPTURE' })
    )
    const result = await service.capture(TENANT, 'pi_1')
    expect(result).toBeDefined()
    expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCEEDED' }),
      })
    )
  })

  it('throws 409 when status is not REQUIRES_CAPTURE', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'SUCCEEDED' })
    )
    await expect(service.capture(TENANT, 'pi_1')).rejects.toMatchObject({
      code: 'payment-intent/invalid-transition',
      httpStatus: 409,
    })
  })

  it('404s unknown intent', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
    await expect(service.capture(TENANT, 'pi_gone')).rejects.toMatchObject({
      code: 'payment-intent/not-found',
      httpStatus: 404,
    })
  })
})

describe('paymentIntentsService.cancel', () => {
  it('cancels a pending intent', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'REQUIRES_CONFIRMATION' })
    )
    const result = await service.cancel(TENANT, 'pi_1', {
      cancellationReason: 'requested',
    } as unknown as never)
    expect(result).toBeDefined()
    expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELED' }),
      })
    )
  })

  it('throws 409 when already SUCCEEDED', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'SUCCEEDED' })
    )
    await expect(
      service.cancel(TENANT, 'pi_1', {} as unknown as never)
    ).rejects.toMatchObject({
      code: 'payment-intent/invalid-transition',
      httpStatus: 409,
    })
  })

  it('throws 409 when already CANCELED', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'CANCELED' })
    )
    await expect(
      service.cancel(TENANT, 'pi_1', {} as unknown as never)
    ).rejects.toMatchObject({
      code: 'payment-intent/invalid-transition',
      httpStatus: 409,
    })
  })

  it('allows cancel from REQUIRES_PAYMENT_METHOD', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'REQUIRES_PAYMENT_METHOD' })
    )
    const result = await service.cancel(TENANT, 'pi_1', {} as unknown as never)
    expect(result).toBeDefined()
  })

  it('404s unknown intent', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(null)
    await expect(
      service.cancel(TENANT, 'pi_gone', {} as unknown as never)
    ).rejects.toMatchObject({
      code: 'payment-intent/not-found',
      httpStatus: 404,
    })
  })

  it('stores cancellationReason when provided', async () => {
    mockPrisma.paymentIntent.findFirst.mockResolvedValue(
      intentRow({ status: 'REQUIRES_CONFIRMATION' })
    )
    await service.cancel(TENANT, 'pi_1', {
      cancellationReason: 'fraud',
    } as unknown as never)
    expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cancellationReason: 'fraud' }),
      })
    )
  })
})
