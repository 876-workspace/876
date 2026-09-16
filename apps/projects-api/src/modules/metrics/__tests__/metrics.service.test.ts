import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => ({
  repository: {
    countAutomationRuns: vi.fn(),
    countWebhookDeliveries: vi.fn(),
    countImportJobs: vi.fn(),
  },
}))

vi.mock('../metrics.repository.js', () => repository)

const service = await import('../metrics.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  repository.countAutomationRuns.mockResolvedValue([])
  repository.countWebhookDeliveries.mockResolvedValue([])
  repository.countImportJobs.mockResolvedValue({ total: 0, failed: 0 })
})

describe('getMetricsSummary', () => {
  it('computes counts and failure rates', async () => {
    repository.countAutomationRuns.mockResolvedValueOnce([
      { status: 'succeeded', count: 8 },
      { status: 'failed', count: 2 },
    ])
    repository.countAutomationRuns.mockResolvedValueOnce([
      { status: 'succeeded', count: 80 },
      { status: 'failed', count: 20 },
    ])
    repository.countWebhookDeliveries.mockResolvedValue([
      { status: 'delivered', count: 5 },
    ])
    const summary = await service.getMetricsSummary(1_700_000_000)
    expect(summary.object).toBe('projects.metrics-summary')
    expect(summary.automationRuns.last24h).toEqual({
      total: 10,
      failed: 2,
      failureRate: 0.2,
    })
    expect(summary.automationRuns.last7d.failureRate).toBe(0.2)
    expect(summary.webhookDeliveries.last24h).toEqual({
      total: 5,
      failed: 0,
      failureRate: 0,
    })
  })

  it('handles empty windows without dividing by zero', async () => {
    const summary = await service.getMetricsSummary(1_700_000_000)
    expect(summary.importJobs.last24h).toEqual({
      total: 0,
      failed: 0,
      failureRate: 0,
    })
  })

  it('counts jobs with row failures as failed', async () => {
    repository.countImportJobs.mockResolvedValueOnce({ total: 4, failed: 1 })
    repository.countImportJobs.mockResolvedValueOnce({ total: 10, failed: 1 })
    const summary = await service.getMetricsSummary(1_700_000_000)
    expect(summary.importJobs.last24h).toEqual({
      total: 4,
      failed: 1,
      failureRate: 0.25,
    })
  })

  it('queries day and week windows', async () => {
    await service.getMetricsSummary(1_700_000_000)
    const day = BigInt(1_700_000_000 - 24 * 3600)
    const week = BigInt(1_700_000_000 - 7 * 24 * 3600)
    expect(repository.countAutomationRuns).toHaveBeenNthCalledWith(1, day)
    expect(repository.countAutomationRuns).toHaveBeenNthCalledWith(2, week)
  })

  it('stamps the generation time', async () => {
    const summary = await service.getMetricsSummary(1_700_000_000)
    expect(summary.generatedAt).toBe(1_700_000_000)
    expect(summary.windowDays).toBe(7)
  })

  it('treats non-failed delivery states as non-failures', async () => {
    repository.countWebhookDeliveries.mockResolvedValue([
      { status: 'pending', count: 3 },
      { status: 'scheduled', count: 2 },
      { status: 'failed', count: 1 },
    ])
    const summary = await service.getMetricsSummary(1_700_000_000)
    expect(summary.webhookDeliveries.last7d).toEqual({
      total: 6,
      failed: 1,
      failureRate: 1 / 6,
    })
  })
})
