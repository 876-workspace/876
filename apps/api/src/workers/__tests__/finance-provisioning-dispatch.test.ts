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

function financeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fpe_01',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'org_01:app_01',
    organizationId: 'org_01',
    organizationName: 'Acme',
    organizationSlug: 'acme',
    organizationCountryCode: 'JM',
    organizationCurrencyCode: 'JMD',
    sourceAppId: 'app_01',
    entitlementReference: 'sub_01',
    provisioningVersion: 1,
    lifecycleVersion: 1,
    desiredStatus: 'ACTIVE',
    scopes: ['read'],
    occurredAt: BigInt(NOW),
    status: 'pending',
    attemptCount: 0,
    availableAt: BigInt(NOW),
    lockedAt: null,
    deliveredAt: null,
    lastError: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    runId: null,
    ...overrides,
  }
}

describe('finance-provisioning-dispatch', () => {
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
    mockTx.financeProvisioningOutbox.findMany.mockResolvedValue([])
    mockTx.financeProvisioningOutbox.updateMany.mockResolvedValue({ count: 0 })
    mockTx.financeProvisioningOutbox.update.mockResolvedValue({})
    mockTx.provisioningRun.findMany.mockResolvedValue([])
    mockTx.provisioningRun.findUnique.mockResolvedValue(null)
    mockTx.provisioningRun.update.mockResolvedValue({})
    mockTx.provisioningRun.updateMany.mockResolvedValue({ count: 0 })
    mockTx.provisioningRunStep.findMany.mockResolvedValue([])
    mockTx.provisioningRunStep.update.mockResolvedValue({})
    mockTx.provisioningRunStep.updateMany.mockResolvedValue({ count: 0 })

    fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns not configured when billing destination is missing', async () => {
    mockSettings.billing.url = ''
    const { dispatchFinanceProvisioningOnce } =
      await import('../finance-provisioning-dispatch')
    const result = await dispatchFinanceProvisioningOnce()
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      configured: false,
    })
  })

  it('expires stale application runs before checking configuration', async () => {
    mockSettings.billing.url = ''
    mockTx.$queryRaw.mockResolvedValueOnce([]) // expire SELECT
    const { dispatchFinanceProvisioningOnce } =
      await import('../finance-provisioning-dispatch')
    await dispatchFinanceProvisioningOnce()
    expect(mockTx.$queryRaw).toHaveBeenCalled()
    const firstSql = String(mockTx.$queryRaw.mock.calls[0]![0])
    expect(firstSql).toMatch(/provisioning_runs/)
    expect(firstSql).toMatch(/outbox_event_id IS NULL/)
  })

  it('returns zero claimed when no events are available', async () => {
    // expire returns 0
    mockTx.$queryRaw.mockResolvedValueOnce([]) // expire
    mockTx.$queryRaw.mockResolvedValueOnce([]) // claim
    const { dispatchFinanceProvisioningOnce } =
      await import('../finance-provisioning-dispatch')
    const result = await dispatchFinanceProvisioningOnce()
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      configured: true,
    })
  })

  it('delivers a claimed event and marks succeeded run', async () => {
    const row = financeRow({ id: 'fpe_01', runId: 'prn_01', attemptCount: 0 })
    const updated = {
      ...row,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }

    // expire
    mockTx.$queryRaw.mockResolvedValueOnce([]) // expire
    // claim: ids
    mockTx.$queryRaw.mockResolvedValueOnce([{ id: 'fpe_01' }])
    mockTx.financeProvisioningOutbox.findMany
      .mockResolvedValueOnce([updated]) // first fetch for ordering
      .mockResolvedValueOnce([updated]) // refreshed fetch
    mockTx.financeProvisioningOutbox.updateMany.mockResolvedValue({ count: 1 })
    mockTx.provisioningRun.findUnique.mockResolvedValue({ id: 'prn_01' })
    mockTx.provisioningRun.update.mockResolvedValue({})
    mockTx.provisioningRunStep.findMany.mockResolvedValue([
      { id: 'prs_01', status: 'queued' } as never,
    ])
    mockTx.provisioningRunStep.update.mockResolvedValue({})

    // mark delivered will SELECT then update; need to mock that transaction's SELECT
    mockTx.$queryRaw.mockResolvedValueOnce([
      { id: 'fpe_01', status: 'processing', run_id: 'prn_01' },
    ])
    mockTx.provisioningRun.findUnique.mockResolvedValueOnce({
      id: 'prn_01',
    } as never)

    const { dispatchFinanceProvisioningOnce } =
      await import('../finance-provisioning-dispatch')
    const result = await dispatchFinanceProvisioningOnce()

    expect(result).toEqual({
      claimed: 1,
      delivered: 1,
      failed: 0,
      configured: true,
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.com/api/v1/admin/finance-connections/ensure',
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-request-id': 'fpe_01' }),
      })
    )
  })

  it('marks failed on delivery error and continues to next event', async () => {
    const row1 = financeRow({ id: 'fpe_01', runId: null })
    const row2 = financeRow({ id: 'fpe_02', runId: null })
    const upd1 = {
      ...row1,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }
    const upd2 = {
      ...row2,
      attemptCount: 1,
      status: 'processing',
      lockedAt: BigInt(NOW),
    }

    mockTx.$queryRaw.mockResolvedValueOnce([]) // expire
    mockTx.$queryRaw.mockResolvedValueOnce([{ id: 'fpe_01' }, { id: 'fpe_02' }])
    mockTx.financeProvisioningOutbox.findMany
      .mockResolvedValueOnce([upd1, upd2])
      .mockResolvedValueOnce([upd1, upd2])
    mockTx.financeProvisioningOutbox.updateMany.mockResolvedValue({ count: 2 })
    mockTx.provisioningRun.findUnique.mockResolvedValue(null)

    fetchMock
      .mockResolvedValueOnce(new Response('bad', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

    mockTx.$queryRaw
      .mockResolvedValueOnce([
        { id: 'fpe_01', status: 'processing', run_id: null },
      ]) // markFailed
      .mockResolvedValueOnce([
        { id: 'fpe_02', status: 'processing', run_id: null },
      ]) // markDelivered

    mockTx.financeProvisioningOutbox.update.mockResolvedValue({})

    const { dispatchFinanceProvisioningOnce } =
      await import('../finance-provisioning-dispatch')
    const result = await dispatchFinanceProvisioningOnce()

    expect(result).toEqual({
      claimed: 2,
      delivered: 1,
      failed: 1,
      configured: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('claim uses correct ordering and FOR UPDATE SKIP LOCKED', async () => {
    const { claimFinanceProvisioningEvents } =
      await import('../finance-provisioning-dispatch.repository')
    mockTx.$queryRaw.mockResolvedValue([])
    mockTx.financeProvisioningOutbox.findMany.mockResolvedValue([])
    mockTx.financeProvisioningOutbox.updateMany.mockResolvedValue({ count: 0 })
    await claimFinanceProvisioningEvents(NOW, 10)
    const sql = String(mockTx.$queryRaw.mock.calls[0]![0])
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/)
    expect(sql).toMatch(
      /ORDER BY created_at ASC, aggregate_id ASC, lifecycle_version ASC/
    )
    expect(sql).toMatch(/status IN \('pending','failed'\)/)
  })

  it('expireStaleApplicationRuns selects with correct predicate', async () => {
    const { expireStaleApplicationRuns } =
      await import('../finance-provisioning-dispatch.repository')
    mockTx.$queryRaw.mockResolvedValue([])
    await expireStaleApplicationRuns(NOW, 300)
    const sql = String(mockTx.$queryRaw.mock.calls[0]![0])
    expect(sql).toMatch(/outbox_event_id IS NULL/)
    expect(sql).toMatch(/status = 'processing'/)
    expect(sql).toMatch(/started_at <=/)
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/)
  })

  it('markFinanceProvisioningFailed computes backoff and truncates', async () => {
    const { markFinanceProvisioningFailed } =
      await import('../finance-provisioning-dispatch.repository')
    mockTx.$queryRaw.mockResolvedValue([
      { id: 'fpe_01', status: 'processing', run_id: null },
    ])
    mockTx.financeProvisioningOutbox.update.mockResolvedValue({})
    mockTx.provisioningRun.findUnique.mockResolvedValue(null)

    const long = 'y'.repeat(5000)
    await markFinanceProvisioningFailed('fpe_01', 2, long, NOW)
    const data = mockTx.financeProvisioningOutbox.update.mock.calls[0]![0] as {
      data: { lastError: string; availableAt: bigint }
    }
    expect(data.data.lastError.length).toBe(2000)
    // attempt 2 => 5*4=20
    expect(data.data.availableAt).toBe(BigInt(NOW + 20))
  })
})
