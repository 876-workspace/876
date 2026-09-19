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

vi.mock('@/lib/clients/communications', () => ({
  createCommunications: mocks.createClient,
  communications: { templates: { list: mocks.list } },
}))

import { GET } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

const templateList = {
  object: 'list',
  data: [
    {
      object: 'email_template',
      id: 'etpl_1',
      organizationId: null,
      key: 'invoice.ready',
      name: 'Invoice ready',
      category: 'invoice',
      subject: 'Invoice {{number}} is ready',
      html: '<p>Hi</p>',
      text: null,
      senderId: null,
      isDefault: true,
      isSystem: true,
      isActive: true,
      createdAt: 1_788_000_000,
      updatedAt: 1_788_000_000,
    },
  ],
  has_more: false,
  total_count: 1,
  url: '/v1/organizations/org_target/email/templates',
} as const

function getRequest() {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/email/templates',
    { headers: { 'x-request-id': 'trace_templates_list' } }
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

describe('Console organization email templates route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { id: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({ templates: { list: mocks.list } })
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
    mocks.list.mockResolvedValue({ data: templateList, error: null })

    const response = await GET(getRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: templateList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('trace_templates_list')
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
