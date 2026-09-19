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

vi.mock('@/lib/clients/projects', () => ({
  createProjects: mocks.createClient,
  projects: { issues: { list: mocks.list, create: mocks.create } },
}))

vi.mock('@/lib/clients/platform', () => ({
  platform: { auditEvents: { create: mocks.auditCreate } },
}))

import { GET, POST } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

const issueList = {
  object: 'list',
  data: [
    {
      object: 'projects.issue',
      id: 'issue_1',
      tenantId: 'tenant_1',
      projectId: 'proj_1',
      projectKey: 'ALP',
      number: 1,
      identifier: 'ALP-1',
      title: 'First issue',
      description: null,
      status: 'todo',
      priority: 'high',
      assigneeUserId: 'user_dev',
      creatorUserId: 'user_1',
      parentIssueId: null,
      estimate: 3,
      dueDate: null,
      position: 1,
      labels: [],
      commentCount: 0,
      subIssueCount: 0,
      startedAt: null,
      completedAt: null,
      canceledAt: null,
      createdAt: 1700000000,
      updatedAt: 1700000000,
    },
  ],
  hasMore: false,
  totalCount: 1,
} as const

function listRequest(query = 'status=todo&priority=high') {
  return new NextRequest(
    `http://console.test/api/organizations/org_target/issues?${query}`,
    { headers: { 'x-request-id': 'trace_issues_list' } }
  )
}

function postRequest(body: unknown) {
  return new NextRequest(
    'http://console.test/api/organizations/org_target/issues',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'trace_issues_create',
      },
    }
  )
}

describe('Console organization issues API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      response: null,
      sessionUser: { id: 'user_operator' },
      caller: { userId: 'user_operator' },
    })
    mocks.createClient.mockReturnValue({
      issues: { list: mocks.list, create: mocks.create },
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

  it('lists issues with filters through the operator client when permitted', async () => {
    mocks.list.mockResolvedValue({ data: issueList, error: null })

    const response = await GET(listRequest(), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: issueList, error: null })
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).toHaveBeenCalledWith('trace_issues_list')
    expect(mocks.list).toHaveBeenCalledWith('org_target', {
      status: 'todo',
      priority: 'high',
    })
  })

  it('denies issue creation when lacking issues.create permission', async () => {
    const denied = Response.json(
      { error: 'Insufficient permissions.' },
      { status: 403 }
    )
    mocks.requirePermission.mockResolvedValue({ response: denied })

    const response = await POST(
      postRequest({ projectId: 'proj_1', title: 'New bug' }),
      context
    )

    expect(response.status).toBe(403)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates issue and writes audit event when permitted', async () => {
    const created = {
      ...issueList.data[0],
      id: 'issue_2',
      identifier: 'ALP-2',
      title: 'New bug',
    }
    mocks.create.mockResolvedValue({ data: created, error: null })

    const response = await POST(
      postRequest({ projectId: 'proj_1', title: 'New bug' }),
      context
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ data: created, error: null })
    expect(mocks.createClient).toHaveBeenCalledWith('trace_issues_create')
    expect(mocks.create).toHaveBeenCalledWith('org_target', {
      projectId: 'proj_1',
      title: 'New bug',
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'projects.issue.created',
        appName: '876-console',
        properties: expect.objectContaining({
          organizationId: 'org_target',
          identifier: 'ALP-2',
        }),
      })
    )
  })
})
