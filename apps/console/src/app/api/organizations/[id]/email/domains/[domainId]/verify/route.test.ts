import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  verify: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/clients/communications', () => ({
  createCommunications: mocks.createClient,
  communications: { domains: { verify: mocks.verify } },
}))

vi.mock('@/lib/clients/platform', () => ({
  platform: { auditEvents: { create: mocks.auditCreate } },
}))

import { POST } from './route'

const context = {
  params: Promise.resolve({ id: 'org_target', domainId: 'edom_1' }),
}

const verifiedDomain = {
  object: 'email_domain',
  id: 'edom_1',
  organizationId: 'org_target',
  provider: 'resend',
  name: 'acme.com',
  region: null,
  status: 'verified',
  records: [],
  verifiedAt: 1_788_000_100,
  lastCheckedAt: 1_788_000_100,
  createdAt: 1_788_000_000,
  updatedAt: 1_788_000_100,
} as const

function postRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/email/domains/edom_1/verify',
    {
      method: 'POST',
      headers: { 'x-request-id': 'trace_domain_verify' },
    }
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

describe('Console organization email domain verify route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({ domains: { verify: mocks.verify } })
    mocks.auditCreate.mockResolvedValue({ data: { id: 'audit_1' } })
  })

  it('denies a request lacking the permission with a 403 value', async () => {
    mocks.requirePermission.mockResolvedValue({ response: denied(403) })

    const response = await POST(postRequest(), context)

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
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('denies an unauthenticated request with a 401 value', async () => {
    mocks.requirePermission.mockResolvedValue({ response: denied(401) })

    const response = await POST(postRequest(), context)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/unauthorized', message: 'Unauthorized.' },
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('verifies the domain and audits the mutation', async () => {
    mocks.verify.mockResolvedValue({ data: verifiedDomain, error: null })

    const response = await POST(postRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: verifiedDomain,
      error: null,
    })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_domain_verify')
    expect(mocks.verify).toHaveBeenCalledTimes(1)
    expect(mocks.verify).toHaveBeenCalledWith('org_target', 'edom_1')
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'communications.domain.verify-requested',
        appName: '876-console',
        userId: 'user_operator',
        properties: expect.objectContaining({
          organizationId: 'org_target',
          domainId: 'edom_1',
        }),
      })
    )
  })

  it('returns the service failure message without leaking the service', async () => {
    mocks.verify.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/unavailable',
        message: 'Try again later.',
      },
    })

    const response = await POST(postRequest(), context)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Try again later.' },
    })
    expect(mocks.verify).toHaveBeenCalledTimes(1)
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1)
  })
})
