// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/health',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    metrics: { summary: mocks.summary },
  },
}))

import { HealthData } from './health-data'

function makeSummary() {
  const section = (total: number, failed: number) => ({
    total,
    failed,
    failureRate: total === 0 ? 0 : failed / total,
  })
  return {
    object: 'projects.metrics-summary',
    windowDays: 7,
    generatedAt: 1700000000,
    automationRuns: { last24h: section(10, 1), last7d: section(70, 7) },
    webhookDeliveries: { last24h: section(20, 2), last7d: section(140, 5) },
    importJobs: { last24h: section(3, 0), last7d: section(9, 1) },
  }
}

afterEach(cleanup)

describe('HealthData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.summary.mockResolvedValue({ data: makeSummary(), error: null })
  })

  it('fetches the metrics summary once', async () => {
    render(await HealthData({ organizationId: 'org_1' }))

    expect(mocks.summary).toHaveBeenCalledTimes(1)
  })

  it('renders both windows with subsystem totals', async () => {
    render(await HealthData({ organizationId: 'org_1' }))

    expect(screen.getByText('Last 24 hours')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getAllByText('Automation runs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Webhook deliveries').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Import jobs').length).toBeGreaterThan(0)
  })

  it('renders failure rates for each subsystem', async () => {
    render(await HealthData({ organizationId: 'org_1' }))

    expect(screen.getAllByText('10.0%').length).toBeGreaterThan(0)
  })

  it('surfaces a banner when metrics cannot be loaded', async () => {
    mocks.summary.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await HealthData({ organizationId: 'org_1' }))

    expect(
      screen.getByText('Health data could not be loaded')
    ).toBeInTheDocument()
  })
})
