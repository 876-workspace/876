import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockAssess = vi.fn()
const mockLoggerInfo = vi.fn()

vi.mock('@/platform/logger', () => ({
  getLogger: () => ({
    info: mockLoggerInfo,
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('DocumentsService / assessLateFees / chaos & error propagation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockAssess.mockReset()
    mockLoggerInfo.mockReset()
    // re-apply global mock after resetModules — need to re-mock via vi.doMock for next import
  })

  async function loadService(
    featuresEnabled: boolean,
    assessImpl?: (...args: unknown[]) => unknown
  ) {
    vi.doMock('@/platform/logger', () => ({
      getLogger: () => ({
        info: mockLoggerInfo,
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      }),
    }))
    vi.doMock('../repositories/invoice-preferences', () => ({
      invoicePreferences: { assessLateFees: assessImpl ?? mockAssess },
    }))
    vi.doMock('../repositories/credit-notes', () => ({ creditNotes: {} }))
    vi.doMock('../repositories/estimates', () => ({ estimates: {} }))
    vi.doMock('../repositories/invoices', () => ({ invoices: {} }))
    vi.doMock('../repositories/quotes', () => ({ quotes: {} }))

    const { resetSettingsForTest } = await import('@/config')
    resetSettingsForTest({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: featuresEnabled ? 'true' : 'false',
    } as NodeJS.ProcessEnv)
    const { documentsService } = await import('../documents.service')
    return documentsService
  }

  it('returns parked stub without calling repository when feature disabled (fast path)', async () => {
    // Arrange
    mockAssess.mockResolvedValue({
      data: { created: 99, skipped: 99, hasMore: false },
      error: null,
      status: 200,
    })
    const svc = await loadService(false)
    // Act
    const result = await svc.assessLateFees('ten_1', 1_720_000_000)
    // Assert
    expect(result).toEqual({
      object: 'late_fee_run',
      created: 0,
      skipped: 0,
      hasMore: false,
    })
    expect(mockAssess).not.toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      { tenantId: 'ten_1' },
      expect.stringContaining('BILLING_LATE_FEES_ENABLED')
    )
  })

  it('delegates to invoicePreferences.assessLateFees when feature enabled', async () => {
    // Arrange
    mockAssess.mockResolvedValue({
      data: { created: 2, skipped: 1, hasMore: false },
      error: null,
      status: 200,
    })
    const svc = await loadService(true)
    // Act
    const result = await svc.assessLateFees('ten_1', 123)
    // Assert
    expect(mockAssess).toHaveBeenCalledWith('ten_1', 123)
    expect(result).toEqual(
      expect.objectContaining({ object: 'late_fee_run', created: 2 })
    )
    expect(mockLoggerInfo).not.toHaveBeenCalled()
  })

  it('propagates repository error via AppHttpError without catch wrapping', async () => {
    // Arrange
    mockAssess.mockResolvedValue({
      data: null,
      error: { code: 'billing/db-error', message: 'db down' },
      status: 500,
    })
    const svc = await loadService(true)
    // Act & Assert — use rejects matcher, not try/catch per guide 1.1.4
    await expect(svc.assessLateFees('ten_1')).rejects.toThrow()
  })

  it('propagates network failure (fetch throw) as rejection', async () => {
    // Arrange
    mockAssess.mockRejectedValue(new Error('network timeout'))
    const svc = await loadService(true)
    // Act & Assert
    await expect(svc.assessLateFees('ten_1')).rejects.toThrow('network timeout')
  })

  it('accepts undefined asOf (optional param) and forwards correctly', async () => {
    // Arrange
    mockAssess.mockResolvedValue({
      data: { created: 0, skipped: 0, hasMore: false },
      error: null,
      status: 200,
    })
    const svc = await loadService(true)
    // Act
    await svc.assessLateFees('ten_chaos')
    // Assert
    expect(mockAssess).toHaveBeenCalledWith('ten_chaos', undefined)
  })

  it('isolates tenantId in log call (no leakage of unrelated state)', async () => {
    // Arrange
    mockAssess.mockResolvedValue({
      data: { created: 0, skipped: 0, hasMore: false },
      error: null,
      status: 200,
    })
    const svc = await loadService(false)
    // Act
    await svc.assessLateFees('ten_isolated')
    // Assert
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      { tenantId: 'ten_isolated' },
      expect.any(String)
    )
  })

  it('handles asOf = 0 (falsy but valid) correctly when enabled', async () => {
    // Arrange
    mockAssess.mockResolvedValue({
      data: { created: 1, skipped: 0, hasMore: true },
      error: null,
      status: 200,
    })
    const svc = await loadService(true)
    // Act
    const result = await svc.assessLateFees('ten_1', 0)
    // Assert
    expect(mockAssess).toHaveBeenCalledWith('ten_1', 0)
    expect(result.hasMore).toBe(true)
  })
})
