// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  retrieveEndpoint: vi.fn(),
  listDeliveries: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/webhooks/whep_1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    webhookEndpoints: {
      retrieve: mocks.retrieveEndpoint,
      listDeliveries: mocks.listDeliveries,
    },
  },
}))

vi.mock('./webhook-replay-button', () => ({
  WebhookReplayButton: ({
    deliveryId,
  }: {
    organizationId: string
    deliveryId: string
  }) => <button type="button">{`Replay ${deliveryId}`}</button>,
}))

import { WebhookDetailData } from './webhook-detail-data'

function envelope(data: unknown[], url: string) {
  return {
    object: 'list',
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

function makeEndpoint() {
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
  }
}

function makeDelivery(overrides = {}) {
  return {
    object: 'projects.webhook-delivery',
    id: 'whdl_1',
    tenantId: 'prjten_1',
    endpointId: 'whep_1',
    eventId: 'evt_1',
    attempt: 2,
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

describe('WebhookDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveEndpoint.mockResolvedValue({
      data: makeEndpoint(),
      error: null,
    })
    mocks.listDeliveries.mockResolvedValue({
      data: envelope([makeDelivery()], '/v1/integration/webhook-deliveries'),
      error: null,
    })
  })

  it('retrieves the decoded endpoint and its deliveries', async () => {
    render(
      await WebhookDetailData({
        organizationId: 'org_1',
        base: '/projects',
        endpointId: 'whep%201',
      })
    )

    expect(mocks.retrieveEndpoint).toHaveBeenCalledWith('whep 1')
    expect(mocks.listDeliveries).toHaveBeenCalledWith({
      endpointId: 'whep 1',
      limit: 50,
    })
  })

  it('renders the endpoint url and its delivery', async () => {
    render(
      await WebhookDetailData({
        organizationId: 'org_1',
        base: '/projects',
        endpointId: 'whep_1',
      })
    )

    expect(
      screen.getByText('https://hooks.example.com/projects')
    ).toBeInTheDocument()
    expect(screen.getAllByText('evt_1').length).toBeGreaterThan(0)
  })

  it('offers replay only for failed deliveries', async () => {
    mocks.listDeliveries.mockResolvedValue({
      data: envelope(
        [
          makeDelivery({ id: 'whdl_1', status: 'failed' }),
          makeDelivery({ id: 'whdl_2', status: 'succeeded', eventId: 'evt_2' }),
        ],
        '/v1/integration/webhook-deliveries'
      ),
      error: null,
    })

    render(
      await WebhookDetailData({
        organizationId: 'org_1',
        base: '/projects',
        endpointId: 'whep_1',
      })
    )

    expect(
      screen.getByRole('button', { name: 'Replay whdl_1' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Replay whdl_2' })
    ).not.toBeInTheDocument()
  })

  it('sends missing endpoints to notFound', async () => {
    mocks.retrieveEndpoint.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/webhook-endpoint-not-found',
        message: 'Missing.',
      },
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })

    await expect(
      WebhookDetailData({
        organizationId: 'org_1',
        base: '/projects',
        endpointId: 'whep_missing',
      })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('surfaces a banner when deliveries cannot be loaded', async () => {
    mocks.listDeliveries.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await WebhookDetailData({
        organizationId: 'org_1',
        base: '/projects',
        endpointId: 'whep_1',
      })
    )

    expect(
      screen.getByText('Some webhook deliveries could not be loaded')
    ).toBeInTheDocument()
  })
})
