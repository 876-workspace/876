import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  retrieve: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/services/communications', () => ({
  createCommunications: mocks.createClient,
  communications: { domains: { retrieve: mocks.retrieve } },
}))

import { GET } from './route'

const context = {
  params: Promise.resolve({ id: 'org_target', domainId: 'edom_1' }),
}

const domain = {
  object: 'email_domain',
  id: 'edom_1',
  organizationId: 'org_target',
  provider: 'resend',
  name: 'acme.com',
  region: null,
  status: 'pending',
  records: [
    {
      name: 'resend._domainkey.acme.com',
      type: 'TXT',
      value: 'v=DKIM1; ...',
      purpose: 'DKIM',
    },
  ],
  verifiedAt: null,
  lastCheckedAt: 1_788_000_000,
  createdAt: 1_788_000_000,
  updatedAt: 1_788_000_000,
} as const

function getRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/email/domains/edom_1',
    { headers: { 'x-request-id': 'trace_domain_get' } }
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

describe('Console organization email domain route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({
      domains: { retrieve: mocks.retrieve },
    })
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
    expect(mocks.retrieve).not.toHaveBeenCalled()
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
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })

  it('returns the canonical envelope through the request-scoped client', async () => {
    mocks.retrieve.mockResolvedValue({ data: domain, error: null })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: domain, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_domain_get')
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith('org_target', 'edom_1')
  })

  it('maps a missing domain to 404', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/domain-not-found',
        message: 'Domain not found.',
      },
    })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/not-found', message: 'Domain not found.' },
    })
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
  })

  it('maps any other service failure to 400', async () => {
    mocks.retrieve.mockResolvedValue({
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
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
  })
})
