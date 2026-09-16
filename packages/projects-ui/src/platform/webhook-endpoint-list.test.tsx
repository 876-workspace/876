// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WebhookEndpointList } from './webhook-endpoint-list'
import type { WebhookEndpoint } from './types'

function makeEndpoint(overrides?: Partial<WebhookEndpoint>): WebhookEndpoint {
  return {
    object: 'projects.webhook-endpoint',
    id: 'whe_1',
    url: 'https://example.com/hooks/projects',
    eventTypes: ['issue.created', 'issue.updated'],
    enabled: true,
    consecutiveFailures: 0,
    hasSecret: true,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('WebhookEndpointList', () => {
  afterEach(cleanup)

  it('renders the endpoint url', () => {
    render(<WebhookEndpointList endpoints={[makeEndpoint()]} />)
    expect(screen.getByText('https://example.com/hooks/projects')).toBeInTheDocument()
  })

  it('renders the events count', () => {
    render(<WebhookEndpointList endpoints={[makeEndpoint()]} />)
    expect(screen.getByText(/2 events/)).toBeInTheDocument()
  })

  it('badges an enabled endpoint', () => {
    render(<WebhookEndpointList endpoints={[makeEndpoint({ enabled: true })]} />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
  })

  it('badges a disabled endpoint', () => {
    render(<WebhookEndpointList endpoints={[makeEndpoint({ enabled: false })]} />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('flags five or more consecutive failures', () => {
    render(<WebhookEndpointList endpoints={[makeEndpoint({ consecutiveFailures: 5 })]} />)
    const flagged = screen.getByText('5')
    expect(flagged).toHaveClass('text-destructive')
  })

  it('does not flag fewer than five failures', () => {
    render(<WebhookEndpointList endpoints={[makeEndpoint({ consecutiveFailures: 2 })]} />)
    expect(screen.getByText('2')).not.toHaveClass('text-destructive')
  })

  it('renders the empty state', () => {
    render(<WebhookEndpointList endpoints={[]} />)
    expect(screen.getByText('No webhook endpoints yet')).toBeInTheDocument()
  })
})
