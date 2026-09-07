import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAssess = vi.fn()
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@/platform/logger', () => ({
  getLogger: () => mockLogger,
}))

vi.mock('../repositories/invoice-preferences', () => ({
  invoicePreferences: { assessLateFees: mockAssess },
}))

vi.mock('../repositories/credit-notes', () => ({ creditNotes: {} }))
vi.mock('../repositories/invoices', () => ({ invoices: {} }))
vi.mock('../repositories/quotes', () => ({ quotes: {} }))

describe('documentsService.assessLateFees feature flag', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.doMock('@/platform/logger', () => ({ getLogger: () => mockLogger }))
    vi.doMock('../repositories/invoice-preferences', () => ({
      invoicePreferences: { assessLateFees: mockAssess },
    }))
    vi.doMock('../repositories/credit-notes', () => ({ creditNotes: {} }))
    vi.doMock('../repositories/invoices', () => ({ invoices: {} }))
    vi.doMock('../repositories/quotes', () => ({ quotes: {} }))
  })

  async function loadServiceWithFlag(enabled: string | undefined) {
    const { resetSettingsForTest } = await import('@/config')
    resetSettingsForTest({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: enabled,
    } as NodeJS.ProcessEnv)
    const { documentsService } = await import('../documents.service')
    return documentsService
  }

  it('skips assessment and returns empty run when flag is false', async () => {
    const svc = await loadServiceWithFlag('false')
    const result = await svc.assessLateFees('ten_1', 1234567890)
    expect(result).toEqual({
      object: 'late_fee_run',
      created: 0,
      skipped: 0,
      hasMore: false,
    })
    expect(mockAssess).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      { tenantId: 'ten_1' },
      expect.stringContaining('BILLING_LATE_FEES_ENABLED is disabled')
    )
  })

  it('skips when flag is undefined (defaults to false)', async () => {
    const svc = await loadServiceWithFlag(undefined)
    const result = await svc.assessLateFees('ten_1')
    expect(result.object).toBe('late_fee_run')
    expect(result.created).toBe(0)
    expect(mockAssess).not.toHaveBeenCalled()
  })

  it('delegates to invoicePreferences.assessLateFees when flag is true', async () => {
    mockAssess.mockResolvedValue({
      data: { created: 2, skipped: 1, hasMore: false },
      error: null,
      status: 200,
    })
    const svc = await loadServiceWithFlag('true')
    const result = await svc.assessLateFees('ten_1', 999)
    expect(mockAssess).toHaveBeenCalledWith('ten_1', 999)
    expect(result).toEqual({
      object: 'late_fee_run',
      created: 2,
      skipped: 1,
      hasMore: false,
    })
    expect(mockLogger.info).not.toHaveBeenCalled()
  })

  it('accepts truthy variants like "1", "yes", "on"', async () => {
    for (const val of ['1', 'yes', 'on', 'TRUE']) {
      vi.resetModules()
      vi.doMock('@/platform/logger', () => ({ getLogger: () => mockLogger }))
      vi.doMock('../repositories/invoice-preferences', () => ({
        invoicePreferences: { assessLateFees: mockAssess },
      }))
      vi.doMock('../repositories/credit-notes', () => ({ creditNotes: {} }))
      vi.doMock('../repositories/invoices', () => ({ invoices: {} }))
      vi.doMock('../repositories/quotes', () => ({ quotes: {} }))
      mockAssess.mockResolvedValue({
        data: { created: 0, skipped: 0, hasMore: false },
        error: null,
        status: 200,
      })
      const { resetSettingsForTest } = await import('@/config')
      resetSettingsForTest({
        BILLING_DATABASE_URL: 'postgres://localhost/billing',
        BILLING_LATE_FEES_ENABLED: val,
      } as NodeJS.ProcessEnv)
      const { documentsService } = await import('../documents.service')
      await documentsService.assessLateFees('ten_1')
      expect(mockAssess).toHaveBeenCalled()
      vi.clearAllMocks()
      mockAssess.mockResolvedValue({
        data: { created: 0, skipped: 0, hasMore: false },
        error: null,
        status: 200,
      })
    }
  })
})
