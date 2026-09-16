import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/services/communications', () => ({
  createCommunications: mocks.createClient,
  communications: { domains: { list: mocks.list } },
}))

import { GET } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

const domainList = {
  object: 'list',
  data: [
    {
      object: 'email_domain',
      id: 'edom_1',
      organizationId: 'org_target',
      provider: 'resend',
      name: 'acme.com',
      region: null,
      status: 'verified',
      records: [],
      verifiedAt: 1_788_000_000,
      lastCheckedAt: 1_788_000_000,
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_000,
    },
  ],
  has_more: false,
  total_count: 1,
  url: '/v1/organizations/org_target/email/domains',
} as const

function getRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/email/domains',
    { headers: { 'x-request-id': 'trace_domains_list' } }
  )
}

function denied(status: number) {
  return Response.json(
    {
      data: null,
      error: {
        code: status === 401 ? 'error/unauthorized' : 'error/forbidden',
        message: status === 401 ? 'Unauthorized.' : 'Forbidden.',
      },
    },
    { status }
  )
}

describe('Console organization email domains route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({ domains: { list: mocks.list } })
  })

  it('denies a request lacking the permission with a 403 value', async () => {
    mocks.requirePermission.mockResolvedValue({ response: denied(403) })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/forbidden', message: 'Forbidden.' },
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('denies an unauthenticated request with a 401 value', async () => {
    mocks.requirePermission.mockResolvedValue({ response: denied(401) })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/unauthorized', message: 'Unauthorized.' },
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('returns the canonical envelope through the request-scoped client', async () => {
    mocks.list.mockResolvedValue({ data: domainList, error: null })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: domainList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_domains_list')
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_target')
  })

  it('returns the service failure message without leaking the service', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/unavailable',
        message: 'Try again later.',
      },
    })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Try again later.' },
    })
    expect(mocks.list).toHaveBeenCalledTimes(1)
  })
})
