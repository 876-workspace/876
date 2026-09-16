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
  communications: { senders: { list: mocks.list } },
}))

import { GET } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

const senderList = {
  object: 'list',
  data: [
    {
      object: 'email_sender',
      id: 'esnd_1',
      organizationId: 'org_target',
      domainId: null,
      name: 'Billing',
      email: 'billing@mail.87six.dev',
      replyTo: null,
      kind: 'managed',
      isDefault: true,
      isActive: true,
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_000,
    },
  ],
  has_more: false,
  total_count: 1,
  url: '/v1/organizations/org_target/email/senders',
} as const

function getRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/email/senders',
    { headers: { 'x-request-id': 'trace_senders_list' } }
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

describe('Console organization email senders route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({ senders: { list: mocks.list } })
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
    mocks.list.mockResolvedValue({ data: senderList, error: null })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: senderList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_senders_list')
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
