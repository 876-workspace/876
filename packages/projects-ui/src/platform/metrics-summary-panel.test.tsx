// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { formatFailureRate, MetricsSummaryPanel } from './metrics-summary-panel'
import type { MetricsSummary } from './types'

function makeSummary(): MetricsSummary {
  return {
    object: 'projects.metrics-summary',
    windows: [
      {
        window: '24h',
        automationRuns: { total: 200, failed: 7 },
        webhookDeliveries: { total: 0, failed: 0 },
        importJobs: { total: 3, failed: 1 },
      },
      {
        window: '7d',
        automationRuns: { total: 1000, failed: 25 },
        webhookDeliveries: { total: 400, failed: 40 },
        importJobs: { total: 10, failed: 0 },
      },
    ],
  }
}

describe('MetricsSummaryPanel', () => {
  afterEach(cleanup)

  it('renders both window headings', () => {
    render(<MetricsSummaryPanel summary={makeSummary()} />)
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })

  it('renders totals and failures per section', () => {
    render(<MetricsSummaryPanel summary={makeSummary()} />)
    expect(screen.getByText(/200 total/)).toBeInTheDocument()
    expect(screen.getByText(/7 failed/)).toBeInTheDocument()
  })

  it('renders a one-decimal failure rate from integer maths', () => {
    render(<MetricsSummaryPanel summary={makeSummary()} />)
    expect(screen.getByText('3.5%')).toBeInTheDocument()
  })

  it('renders an em dash when the total is zero', () => {
    render(<MetricsSummaryPanel summary={makeSummary()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('rounds the 7d webhook failure rate to 10.0%', () => {
    render(<MetricsSummaryPanel summary={makeSummary()} />)
    expect(screen.getByText('10.0%')).toBeInTheDocument()
  })

  it('formats zero failures as 0.0%', () => {
    expect(formatFailureRate(10, 0)).toBe('0.0%')
  })

  it('formats zero totals as an em dash', () => {
    expect(formatFailureRate(0, 0)).toBe('—')
  })

  it('renders the empty state', () => {
    render(
      <MetricsSummaryPanel summary={{ object: 'projects.metrics-summary', windows: [] }} />
    )
    expect(screen.getByText('No metrics yet')).toBeInTheDocument()
  })
})
