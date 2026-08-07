import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const mockTx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  billingCustomerOutbox: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  financeProvisioningOutbox: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  provisioningRun: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  provisioningRunStep: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}))

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx)
  ),
  $queryRaw: vi.fn(),
  billingCustomerOutbox: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  financeProvisioningOutbox: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  provisioningRun: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  provisioningRunStep: {
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: prismaMock,
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const mockSettings = vi.hoisted(() => ({
  billing: {
    url: 'https://billing.example.com',
    internalKey: 'test-internal-key',
    runIntervalSeconds: 3600,
    financeProvisioningPollSeconds: 30,
    financeProvisioningBatchSize: 25,
  },
  port: 4000,
  environment: 'test',
  logLevel: 'silent',
}))

vi.mock('@/config', () => ({
  getSettings: vi.fn(() => mockSettings),
}))

const NOW = 1_700_000_000

function billingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bco_01',
    eventType: 'customer.ensure',
    subjectType: 'organization',
    subjectId: 'org_01',
    name: 'Acme',
    email: 'acme@example.com',
    occurredAt: BigInt(NOW),
    status: 'pending',
    attemptCount: 0,
    availableAt: BigInt(NOW),
    lockedAt: null,
    deliveredAt: null,
    lastError: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    customerKind: 'BUSINESS',
    companyName: 'Acme Ltd',
    firstName: null,
    lastName: null,
    phone: null,
    contactUserId: null,
    contactFirstName: null,
    contactLastName: null,
    contactEmail: null,
    contactPhone: null,
    payloadHash: 'abc',
    ...overrides,
  }
}

describe('billing-customer-dispatch', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(NOW * 1000))
    mockSettings.billing.url = 'https://billing.example.com'
    mockSettings.billing.internalKey = 'test-internal-key'
    mockSettings.billing.financeProvisioningBatchSize = 25
    mockSettings.billing.financeProvisioningPollSeconds = 30
    mockSettings.billing.runIntervalSeconds = 3600

    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)
    )
    mockTx.$queryRaw.mockResolvedValue([])
    mockTx.billingCustomerOutbox.findMany.mockResolvedValue([])
    mockTx.billingCustomerOutbox.updateMany.mockResolvedValue({ count: 0 })
    mockTx.billingCustomerOutbox.update.mockResolvedValue({})

    fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns not configured when billing url is missing', async () => {
    mockSettings.billing.url = ''
    const { dispatchBillingCustomerSyncOnce } =
      await import('../billing-customer-dispatch')
    const result = await dispatchBillingCustomerSyncOnce()
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      configured: false,
    })
    expect(mockTx.$queryRaw).not.toHaveBeenCalled()
  })

  it('returns not configured when internal key is missing', async () => {
    mockSettings.billing.internalKey = ''
    const { dispatchBillingCustomerSyncOnce } =
      await import('../billing-customer-dispatch')
    const result = await dispatchBillingCustomerSyncOnce()
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      configured: false,
    })
  })

  it('returns configured with zero claimed when no rows are claimable', async () => {
    mockTx.$queryRaw.mockResolvedValue([])
    const { dispatchBillingCustomerSyncOnce } =
      await import('../billing-customer-dispatch')
    const result = await dispatchBillingCustomerSyncOnce()
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      configured: true,
    })
  })

  it('claims, delivers and marks delivered on success', async () => {
    const row = billingRow({ id: 'bco_01', attemptCount: 0 })
    const updatedRow = {
      ...row,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }
    mockTx.$queryRaw.mockResolvedValueOnce([{ id: 'bco_01' }])
    // Exactly one queued value: `markBillingCustomerDelivered` re-reads through
    // `$queryRaw`, not `findMany`. A second queued value is never consumed, and
    // `clearAllMocks` does not drain that queue — it leaks into the next test
    // and becomes its claim result, a row with no `attemptCount`.
    mockTx.billingCustomerOutbox.findMany.mockResolvedValueOnce([updatedRow])
    mockTx.billingCustomerOutbox.updateMany.mockResolvedValue({ count: 1 })
    // mark delivered transaction: SELECT then update
    mockTx.$queryRaw.mockResolvedValueOnce([
      { id: 'bco_01', status: 'processing' },
    ])
    mockTx.billingCustomerOutbox.update.mockResolvedValue({})

    const { dispatchBillingCustomerSyncOnce } =
      await import('../billing-customer-dispatch')
    const result = await dispatchBillingCustomerSyncOnce()

    expect(result).toEqual({
      claimed: 1,
      delivered: 1,
      failed: 0,
      configured: true,
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]!
    expect(url).toBe(
      'https://billing.example.com/api/v1/admin/customers/ensure'
    )
    expect((opts as RequestInit).headers).toMatchObject({
      'x-internal-key': 'test-internal-key',
      'x-request-id': 'bco_01',
    })
  })

  it('marks failed and continues when delivery returns non-2xx', async () => {
    const row1 = billingRow({ id: 'bco_01', attemptCount: 0 })
    const row2 = billingRow({ id: 'bco_02', attemptCount: 0 })
    const updated1 = {
      ...row1,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }
    const updated2 = {
      ...row2,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }
    mockTx.$queryRaw.mockResolvedValueOnce([{ id: 'bco_01' }, { id: 'bco_02' }])
    mockTx.billingCustomerOutbox.findMany.mockResolvedValueOnce([
      updated1,
      updated2,
    ])
    mockTx.billingCustomerOutbox.updateMany.mockResolvedValue({ count: 2 })

    // First delivery fails with HTTP 500, second succeeds
    fetchMock
      .mockResolvedValueOnce(
        new Response('upstream error text', { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

    // Each mark uses a transaction: need to mock SELECT for markFailed and markDelivered
    mockTx.$queryRaw
      .mockResolvedValueOnce([{ id: 'bco_01', status: 'processing' }]) // markFailed bco_01
      .mockResolvedValueOnce([{ id: 'bco_02', status: 'processing' }]) // markDelivered bco_02

    mockTx.billingCustomerOutbox.update.mockResolvedValue({})

    const { dispatchBillingCustomerSyncOnce } =
      await import('../billing-customer-dispatch')
    const result = await dispatchBillingCustomerSyncOnce()

    expect(result).toEqual({
      claimed: 2,
      delivered: 1,
      failed: 1,
      configured: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('trims trailing slash from billing url', async () => {
    mockSettings.billing.url = 'https://billing.example.com///'
    const row = billingRow({ id: 'bco_01' })
    const updated = {
      ...row,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }
    mockTx.$queryRaw.mockResolvedValueOnce([{ id: 'bco_01' }])
    mockTx.billingCustomerOutbox.findMany.mockResolvedValueOnce([updated])
    mockTx.billingCustomerOutbox.updateMany.mockResolvedValue({ count: 1 })
    mockTx.$queryRaw.mockResolvedValueOnce([
      { id: 'bco_01', status: 'processing' },
    ])
    mockTx.billingCustomerOutbox.update.mockResolvedValue({})

    const { dispatchBillingCustomerSyncOnce } =
      await import('../billing-customer-dispatch')
    await dispatchBillingCustomerSyncOnce()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.com/api/v1/admin/customers/ensure',
      expect.anything()
    )
  })

  it('uses FOR UPDATE SKIP LOCKED with correct predicate and ordering for the claim', async () => {
    const { claimBillingCustomerEvents } =
      await import('../billing-customer-dispatch.repository')
    mockTx.$queryRaw.mockResolvedValue([])
    await claimBillingCustomerEvents(NOW, 10)
    const sql = String(mockTx.$queryRaw.mock.calls[0]![0])
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/)
    expect(sql).toMatch(/status IN \('pending','failed'\)/)
    expect(sql).toMatch(/locked_at <=/)
    expect(sql).toMatch(/available_at <=/)
    expect(sql).toMatch(/ORDER BY created_at ASC, id ASC/)
  })

  it('marks failed with backoff and truncates error to 2000 chars', async () => {
    const { markBillingCustomerFailed } =
      await import('../billing-customer-dispatch.repository')
    mockTx.$queryRaw.mockResolvedValue([{ id: 'bco_01', status: 'processing' }])
    mockTx.billingCustomerOutbox.update.mockResolvedValue({})

    const longMessage = 'x'.repeat(3000)
    await markBillingCustomerFailed('bco_01', 1, longMessage, NOW)
    const updateArg = mockTx.billingCustomerOutbox.update.mock.calls[0]![0] as {
      data: { lastError: string; availableAt: bigint }
    }
    expect(updateArg.data.lastError.length).toBe(2000)
    // attempt 1 => 5 * 2^1 =10
    expect(updateArg.data.availableAt).toBe(BigInt(NOW + 10))

    // attempt 10 => 5*1024=5120 capped 3600
    vi.clearAllMocks()
    mockTx.$queryRaw.mockResolvedValue([{ id: 'bco_02', status: 'processing' }])
    mockTx.billingCustomerOutbox.update.mockResolvedValue({})
    await markBillingCustomerFailed('bco_02', 10, 'err', NOW)
    const capped = mockTx.billingCustomerOutbox.update.mock.calls[0]![0] as {
      data: { availableAt: bigint }
    }
    expect(capped.data.availableAt).toBe(BigInt(NOW + 3600))

    // attempt 20 => also capped (min 10)
    vi.clearAllMocks()
    mockTx.$queryRaw.mockResolvedValue([{ id: 'bco_03', status: 'processing' }])
    mockTx.billingCustomerOutbox.update.mockResolvedValue({})
    await markBillingCustomerFailed('bco_03', 20, 'err', NOW)
    const capped2 = mockTx.billingCustomerOutbox.update.mock.calls[0]![0] as {
      data: { availableAt: bigint }
    }
    expect(capped2.data.availableAt).toBe(BigInt(NOW + 3600))
  })

  it('triggerBillingRunOnce returns false when not configured and does not fetch', async () => {
    mockSettings.billing.url = ''
    const { triggerBillingRunOnce } =
      await import('../billing-customer-dispatch')
    const result = await triggerBillingRunOnce()
    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('triggerBillingRunOnce posts to billing/run and returns true on success', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    const { triggerBillingRunOnce } =
      await import('../billing-customer-dispatch')
    const result = await triggerBillingRunOnce()
    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.com/api/v1/admin/billing/run',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('triggerBillingRunOnce returns false on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }))
    const { triggerBillingRunOnce } =
      await import('../billing-customer-dispatch')
    const result = await triggerBillingRunOnce()
    expect(result).toBe(false)
  })
})
