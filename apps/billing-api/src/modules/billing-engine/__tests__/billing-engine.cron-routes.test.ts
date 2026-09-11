import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ runSweep: vi.fn() }))

vi.mock('../billing-engine.service', () => ({
  billingEngineService: { runSweep: mocks.runSweep },
}))

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const result = {
  object: 'billing_engine_run' as const,
  id: 'subscriptionbillingrun_1',
  asOf: 1_700_000_000,
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  hasMore: false,
  invoiceIds: [],
}

describe('Billing sweep Vercel cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    process.env.BILLING_SCHEDULER_KEY = 'scheduler-secret'
    process.env.CRON_SECRET = 'cron-secret'
    resetSettingsForTest(process.env)
    mocks.runSweep.mockResolvedValue(result)
  })

  it('accepts the configured cron bearer secret', async () => {
    const response = await request(createApp())
      .get('/internal/billing-sweep/cron')
      .set('authorization', 'Bearer cron-secret')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: result, error: null })
    expect(mocks.runSweep).toHaveBeenCalledWith({
      limit: 5_000,
      timeBudgetMs: 240_000,
    })
  })

  it('rejects an incorrect cron bearer secret', async () => {
    const response = await request(createApp())
      .get('/internal/billing-sweep/cron')
      .set('authorization', 'Bearer wrong-secret')

    expect(response.status).toBe(401)
    expect(response.body.error?.code).toBe('auth/invalid-scheduler-key')
    expect(mocks.runSweep).not.toHaveBeenCalled()
  })

  it('rejects a cron invocation without credentials', async () => {
    const response = await request(createApp()).get(
      '/internal/billing-sweep/cron'
    )

    expect(response.status).toBe(401)
    expect(response.body.error?.code).toBe('auth/missing-credential')
    expect(mocks.runSweep).not.toHaveBeenCalled()
  })

  it('fails closed when the cron secret is unset', async () => {
    delete process.env.CRON_SECRET
    resetSettingsForTest(process.env)

    const response = await request(createApp())
      .get('/internal/billing-sweep/cron')
      .set('authorization', 'Bearer cron-secret')

    expect(response.status).toBe(503)
    expect(response.body.error?.code).toBe('auth/scheduler-disabled')
    expect(mocks.runSweep).not.toHaveBeenCalled()
  })

  it('keeps scheduler-key POST invocations working', async () => {
    const response = await request(createApp())
      .post('/internal/billing-sweep')
      .set('x-scheduler-key', 'scheduler-secret')
      .send({})

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: result, error: null })
    expect(mocks.runSweep).toHaveBeenCalledWith({ limit: 25 })
  })
})
