import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876PlatformClient } from '../index'

const SUBSCRIPTION = {
  object: 'subscription',
  id: 'sub_9xZ1',
  status: 'active',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function setup(response = jsonResponse({ data: SUBSCRIPTION, error: null })) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  const $876 = create876PlatformClient({
    fetch: fetchMock,
    baseUrl: 'https://api.876.test',
    internalKey: 'test-internal-key',
  })
  return { $876, fetchMock }
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
  return { url, init, body: JSON.parse(String(init.body)) }
}

describe('platform.subscriptions.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts an activation to the organization apps collection', async () => {
    const { $876, fetchMock } = setup()

    const result = await $876.subscriptions.create('org_7pQ2', {
      appSlug: '876-invoice',
    })

    const { url, init, body } = requestOf(fetchMock)
    expect(url).toBe('https://api.876.test/organizations/org_7pQ2/apps')
    expect(init.method).toBe('POST')
    expect(body).toEqual({
      app_id: undefined,
      app_slug: '876-invoice',
      price_id: undefined,
      require_finance: undefined,
    })
    expect(result).toEqual({ data: SUBSCRIPTION, error: null })
  })

  it('forwards requireFinance as the wire field require_finance', async () => {
    const { $876, fetchMock } = setup()

    await $876.subscriptions.create('org_7pQ2', {
      appSlug: '876-invoice',
      requireFinance: 'embedded',
    })

    const { body } = requestOf(fetchMock)
    expect(body.require_finance).toBe('embedded')
    expect(body.app_slug).toBe('876-invoice')
  })
})
