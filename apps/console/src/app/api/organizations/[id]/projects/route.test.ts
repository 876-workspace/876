import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createClient: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/services/projects', () => ({
  createProjects: mocks.createClient,
  projects: { projects: { list: mocks.list, create: mocks.create } },
}))

vi.mock('@/lib/services/platform', () => ({
  platform: { auditEvents: { create: mocks.auditCreate } },
}))

import { GET, POST } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

const projectList = {
  object: 'list',
  data: [
    {
      object: 'projects.project',
      id: 'proj_1',
      tenantId: 'tenant_1',
      name: 'Alpha',
      key: 'ALP',
      slug: 'alpha',
      description: 'Alpha project',
      leadUserId: 'user_lead',
      status: 'active',
      health: 'on-track',
      startDate: null,
      targetDate: null,
      nextIssueNumber: 1,
      customerId: null,
      position: 1,
      archivedAt: null,
      createdAt: 1700000000,
      updatedAt: 1700000000,
      memberCount: 2,
    },
  ],
  hasMore: false,
  totalCount: 1,
} as const

function listRequest(query = 'status=active&lead=user_lead') {
  return new NextRequest(
    `http://console.test/api/organizations/org_target/projects?${query}`,
    { headers: { 'x-request-id': 'trace_projects_list' } }
  )
}

function postRequest(body: unknown) {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/projects',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'trace_projects_create',
      },
    }
  )
}

describe('Console organization projects API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { userId: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({
      projects: { list: mocks.list, create: mocks.create },
    })
    mocks.auditCreate.mockResolvedValue({ data: { id: 'audit_1' } })
  })

  it('denies without the Console permission and the operator client is not.toHaveBeenCalled()', async () => {
    const denied = Response.json(
      { error: 'Insufficient permissions.' },
      { status: 403 }
    )
    mocks.requirePermission.mockResolvedValue({ response: denied })

    const response = await GET(listRequest(), context)

    expect(response.status).toBe(403)
    expect(mocks.requirePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('lists projects with filters through the operator client when permitted', async () => {
    mocks.list.mockResolvedValue({ data: projectList, error: null })

    const response = await GET(listRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: projectList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledWith('trace_projects_list')
    expect(mocks.list).toHaveBeenCalledWith('org_target', {
      status: 'active',
      lead: 'user_lead',
    })
  })

  it('denies project creation when lacking projects.create permission', async () => {
    const denied = Response.json(
      { error: 'Insufficient permissions.' },
      { status: 403 }
    )
    mocks.requirePermission.mockResolvedValue({ response: denied })

    const response = await POST(
      postRequest({ name: 'Beta', key: 'BET' }),
      context
    )

    expect(response.status).toBe(403)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates project and writes audit event when permitted', async () => {
    const created = {
      ...projectList.data[0],
      id: 'proj_beta',
      name: 'Beta',
      key: 'BET',
    }
    mocks.create.mockResolvedValue({ data: created, error: null })

    const response = await POST(
      postRequest({ name: 'Beta', key: 'BET' }),
      context
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ data: created, error: null })
    expect(mocks.createClient).toHaveBeenCalledWith('trace_projects_create')
    expect(mocks.create).toHaveBeenCalledWith('org_target', {
      name: 'Beta',
      key: 'BET',
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'projects.project.created',
        appName: '876-console',
        properties: expect.objectContaining({
          organizationId: 'org_target',
          key: 'BET',
        }),
      })
    )
  })
})
