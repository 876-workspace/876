import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assessLateFees: vi.fn(),
  getSettings: vi.fn(() => ({
    databaseUrl: 'postgresql://test:test@127.0.0.1:5432/test',
    environment: 'test',
    features: { lateFees: false },
  })),
  info: vi.fn(),
}))

vi.mock('@/config', () => ({ getSettings: mocks.getSettings }))
vi.mock('@/platform/logger', () => ({
  getLogger: () => ({ info: mocks.info }),
}))
vi.mock('../repositories/invoice-preferences', () => ({
  invoicePreferences: { assessLateFees: mocks.assessLateFees },
}))

import { documentsService } from '../documents.service'

const TENANT = 'ten_1'

function setLateFeesEnabled(enabled: boolean): void {
  mocks.getSettings.mockReturnValue({
    databaseUrl: 'postgresql://test:test@127.0.0.1:5432/test',
    environment: 'test',
    features: { lateFees: enabled },
  })
}

describe('documentsService.assessLateFees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not assess or write late fees when the platform switch is off', async () => {
    setLateFeesEnabled(false)

    await expect(documentsService.assessLateFees(TENANT)).resolves.toEqual({
      object: 'late_fee_run',
      created: 0,
      skipped: 0,
      hasMore: false,
    })

    // The repository owns all late-fee writes, so not calling it proves this
    // platform-level gate writes no rows.
    expect(mocks.assessLateFees).not.toHaveBeenCalled()
  })

  it('logs exactly once when the platform switch blocks an assessment', async () => {
    setLateFeesEnabled(false)

    await documentsService.assessLateFees(TENANT)

    expect(mocks.info).toHaveBeenCalledTimes(1)
    expect(mocks.info).toHaveBeenCalledWith(
      { tenantId: TENANT },
      'BILLING_LATE_FEES_ENABLED is disabled; skipping late-fee assessment.'
    )
  })

  it('continues to respect a tenant with late fees disabled when the platform switch is on', async () => {
    setLateFeesEnabled(true)
    mocks.assessLateFees.mockResolvedValue({
      data: { created: 0, skipped: 0, hasMore: false },
      error: null,
    })

    await expect(documentsService.assessLateFees(TENANT)).resolves.toEqual({
      object: 'late_fee_run',
      created: 0,
      skipped: 0,
      hasMore: false,
    })
    expect(mocks.assessLateFees).toHaveBeenCalledWith(TENANT, undefined)
    expect(mocks.info).not.toHaveBeenCalled()
  })

  it('continues to create tenant-enabled late fees when the platform switch is on', async () => {
    setLateFeesEnabled(true)
    mocks.assessLateFees.mockResolvedValue({
      data: { created: 1, skipped: 0, hasMore: false },
      error: null,
    })

    await expect(documentsService.assessLateFees(TENANT)).resolves.toEqual({
      object: 'late_fee_run',
      created: 1,
      skipped: 0,
      hasMore: false,
    })
    expect(mocks.assessLateFees).toHaveBeenCalledWith(TENANT, undefined)
  })
})
