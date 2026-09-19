import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  summary: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/integration', () => ({
  integration: { getMetricsSummary: mocks.summary },
}))

const { GET } = await import('./route')

const summary = {
  object: 'projects.metrics-summary',
  windowDays: 7,
  generatedAt: 1700000000,
  automationRuns: {
    last24h: { total: 1, failed: 0, failureRate: 0 },
    last7d: { total: 1, failed: 0, failureRate: 0 },
  },
  webhookDeliveries: {
    last24h: { total: 0, failed: 0, failureRate: 0 },
    last7d: { total: 0, failed: 0, failureRate: 0 },
  },
  importJobs: {
    last24h: { total: 0, failed: 0, failureRate: 0 },
    last7d: { total: 0, failed: 0, failureRate: 0 },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.summary.mockResolvedValue({ data: summary, error: null })
})

describe('GET /api/metrics/summary', () => {
  it('requires the projects edit permission', async () => {
    await GET()
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('returns the summary', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { data: { object: string } }
    expect(payload.data.object).toBe('projects.metrics-summary')
  })

  it('returns 400 when metrics fail', async () => {
    mocks.summary.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    expect((await GET()).status).toBe(400)
  })
})
