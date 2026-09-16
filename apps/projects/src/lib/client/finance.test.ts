/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

const { financeClient } = await import('./finance')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.request.mockResolvedValue({ data: {}, error: null })
})

describe('financeClient', () => {
  it('fetches billing settings from the billing route', async () => {
    await financeClient.getBilling('prj_1')

    expect(mocks.request).toHaveBeenCalledWith('/api/projects/prj_1/billing')
  })

  it('saves billing settings with a PUT of integer minor units', async () => {
    await financeClient.putBilling('prj_1', {
      billingMethod: 'fixed-fee',
      currency: 'USD',
      fixedFeeAmount: 250000,
    })

    expect(mocks.request).toHaveBeenCalledWith('/api/projects/prj_1/billing', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        billingMethod: 'fixed-fee',
        currency: 'USD',
        fixedFeeAmount: 250000,
      }),
    })
  })

  it('requests the financial summary with the period query', async () => {
    await financeClient.getSummary('prj_1', 1, 2)

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/projects/prj_1/financial-summary?from=1&to=2'
    )
  })

  it('creates budgets and rates with POST', async () => {
    await financeClient.createBudget('prj_1', {
      scope: 'project',
      amountMinor: 1000,
    })
    await financeClient.createRate('prj_1', {
      scope: 'project',
      billRateMinor: 15000,
      costRateMinor: 9000,
    })

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/projects/prj_1/budgets',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/projects/prj_1/rates',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('updates budgets and rates with PATCH', async () => {
    await financeClient.updateBudget('prj_1', 'bud_1', {
      thresholdPercent: 90,
    })
    await financeClient.updateRate('prj_1', 'rate_1', { billRateMinor: 16000 })

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/projects/prj_1/budgets/bud_1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/projects/prj_1/rates/rate_1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('hands the invoice period to the invoice-drafts route', async () => {
    await financeClient.createInvoiceDraft('prj_1', { from: 1, to: 2 })

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/projects/prj_1/invoice-drafts',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
