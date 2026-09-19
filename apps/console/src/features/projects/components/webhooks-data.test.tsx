// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  listEndpoints: vi.fn(),
  listDeliveries: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/webhooks',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    webhookEndpoints: {
      list: mocks.listEndpoints,
      listDeliveries: mocks.listDeliveries,
    },
  },
}))

import { WebhooksData } from './webhooks-data'

function envelope(data: unknown[], url: string) {
  return {
    object: 'list',
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

function makeEndpoint(overrides = {}) {
  return {
    object: 'projects.webhook-endpoint',
    id: 'whep_1',
    tenantId: 'prjten_1',
    url: 'https://hooks.example.com/projects',
    eventTypes: ['*'],
    enabled: true,
    consecutiveFailures: 0,
    createdAt: 1700000000,
    updatedAt: 1700000001,
    ...overrides,
  }
}

function makeDelivery(overrides = {}) {
  return {
    object: 'projects.webhook-delivery',
    id: 'whdl_1',
    tenantId: 'prjten_1',
    endpointId: 'whep_1',
    eventId: 'evt_1',
    attempt: 1,
    status: 'failed',
    responseCode: 500,
    errorCode: null,
    nextAttemptAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

afterEach(cleanup)

describe('WebhooksData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listEndpoints.mockResolvedValue({
      data: envelope([makeEndpoint()], '/v1/integration/webhook-endpoints'),
      error: null,
    })
    mocks.listDeliveries.mockResolvedValue({
      data: envelope([makeDelivery()], '/v1/integration/webhook-deliveries'),
      error: null,
    })
  })

  it('fetches endpoints and recent deliveries together', async () => {
    render(await WebhooksData({ organizationId: 'org_1', base: '/projects' }))

    expect(mocks.listEndpoints).toHaveBeenCalledTimes(1)
    expect(mocks.listDeliveries).toHaveBeenCalledWith({ limit: 50 })
  })

  it('renders endpoint urls without secrets', async () => {
    const { container } = render(
      await WebhooksData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('https://hooks.example.com/projects')
    ).toBeInTheDocument()
    expect(container.textContent).not.toContain('secret')
  })

  it('links each endpoint to its delivery detail under the host root', async () => {
    render(
      await WebhooksData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
      })
    )

    expect(
      screen.getByRole('link', {
        name: 'View deliveries for https://hooks.example.com/projects',
      })
    ).toHaveAttribute(
      'href',
      '/workspace/acme/projects/webhooks/whep_1'
    )
  })

  it('renders delivery rows with status and attempt', async () => {
    render(await WebhooksData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('evt_1')).toBeInTheDocument()
  })

  it('surfaces a banner when webhook reads fail', async () => {
    mocks.listEndpoints.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await WebhooksData({ organizationId: 'org_1', base: '/projects' }))

    expect(
      screen.getByText('Webhook data could not be loaded')
    ).toBeInTheDocument()
  })

  it('shows empty states when no endpoints or deliveries exist', async () => {
    mocks.listEndpoints.mockResolvedValue({
      data: envelope([], '/v1/integration/webhook-endpoints'),
      error: null,
    })
    mocks.listDeliveries.mockResolvedValue({
      data: envelope([], '/v1/integration/webhook-deliveries'),
      error: null,
    })

    render(await WebhooksData({ organizationId: 'org_1', base: '/projects' }))

    expect(screen.getByText('No webhook endpoints yet')).toBeInTheDocument()
    expect(screen.getByText('No webhook deliveries yet')).toBeInTheDocument()
  })
})
