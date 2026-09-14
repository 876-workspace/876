import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  requirePermission: vi.fn(),
  createProject: vi.fn(),
  createIssue: vi.fn(),
  createLabel: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
  requireApiPermission: mocks.requirePermission,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: { create: mocks.createProject },
    issues: { create: mocks.createIssue },
    labels: { create: mocks.createLabel },
  },
}))

const { POST: createProjectRoute } = await import('./route')
const { POST: createIssueRoute } = await import('../issues/route')
const { POST: createLabelRoute } = await import('../labels/route')

function request(url: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  const allowed = {
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  }
  mocks.requireAccess.mockResolvedValue(allowed)
  mocks.requirePermission.mockResolvedValue(allowed)
  mocks.createProject.mockResolvedValue({
    data: { object: 'projects.project', id: 'prj_1' },
    error: null,
  })
  mocks.createIssue.mockResolvedValue({
    data: { object: 'projects.issue', id: 'iss_1' },
    error: null,
  })
  mocks.createLabel.mockResolvedValue({
    data: { object: 'projects.label', id: 'lbl_1' },
    error: null,
  })
})

describe('POST /api/projects', () => {
  it('authorizes on the projects module and projects.create before touching the client', async () => {
    await createProjectRoute(request('/api/projects', { name: 'Console' }))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.create',
    })
    expect(mocks.requireAccess).toHaveBeenCalledTimes(1)
  })

  it('returns the guard response and never calls the client when denied', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response('{"error":"Forbidden."}', { status: 403 }),
    })

    const response = await createProjectRoute(
      request('/api/projects', { name: 'Console' })
    )

    expect(response.status).toBe(403)
    expect(mocks.createProject).not.toHaveBeenCalled()
  })

  it('creates the project scoped to the authorized organization', async () => {
    const response = await createProjectRoute(
      request('/api/projects', { name: 'Console Revamp' })
    )

    expect(response.status).toBe(201)
    expect(mocks.createProject).toHaveBeenCalledWith('org_1', {
      name: 'Console Revamp',
    })
    expect(await response.json()).toEqual({
      data: { object: 'projects.project', id: 'prj_1' },
      error: null,
    })
  })

  it('rejects a missing name with 422 and never calls the client', async () => {
    const response = await createProjectRoute(request('/api/projects', {}))

    expect(response.status).toBe(422)
    expect(mocks.createProject).not.toHaveBeenCalled()
  })

  it('rejects an unknown field rather than forwarding it', async () => {
    const response = await createProjectRoute(
      request('/api/projects', { name: 'Console', tenantId: 'prjten_other' })
    )

    expect(response.status).toBe(422)
    expect(mocks.createProject).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    const response = await createProjectRoute(request('/api/projects'))

    expect(response.status).toBe(422)
    expect(mocks.createProject).not.toHaveBeenCalled()
  })

  it('surfaces a service error as 400 without inventing data', async () => {
    mocks.createProject.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-key-taken',
        message: 'Another project already uses that key.',
      },
    })

    const response = await createProjectRoute(
      request('/api/projects', { name: 'Console' })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'error/bad-request',
        message: 'Another project already uses that key.',
      },
    })
  })
})

describe('POST /api/issues', () => {
  it('authorizes on the issues module and issues.create', async () => {
    await createIssueRoute(request('/api/issues', { title: 'Fix login' }))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.create',
    })
  })

  it('creates the issue scoped to the authorized organization', async () => {
    const response = await createIssueRoute(
      request('/api/issues', { title: 'Fix login' })
    )

    expect(response.status).toBe(201)
    expect(mocks.createIssue).toHaveBeenCalledWith('org_1', {
      title: 'Fix login',
    })
  })

  it('forwards configured work-structure fields without accepting extras', async () => {
    const response = await createIssueRoute(
      request('/api/issues', {
        title: 'Fix login',
        typeKey: 'bug',
        status: 'todo',
        milestoneId: 'milestone_1',
        customFields: [{ fieldId: 'field_1', value: 'customer' }],
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.createIssue).toHaveBeenCalledWith('org_1', {
      title: 'Fix login',
      typeKey: 'bug',
      status: 'todo',
      milestoneId: 'milestone_1',
      customFields: [{ fieldId: 'field_1', value: 'customer' }],
    })
  })

  it('rejects a missing title with 422', async () => {
    const response = await createIssueRoute(request('/api/issues', {}))

    expect(response.status).toBe(422)
    expect(mocks.createIssue).not.toHaveBeenCalled()
  })

  it('never calls the client when denied', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response('{}', { status: 403 }),
    })

    await createIssueRoute(request('/api/issues', { title: 'Fix login' }))

    expect(mocks.createIssue).not.toHaveBeenCalled()
  })
})

describe('POST /api/labels', () => {
  it('authorizes on labels.create without inventing a Labels module', async () => {
    await createLabelRoute(request('/api/labels', { name: 'bug' }))

    expect(mocks.requirePermission).toHaveBeenCalledWith('labels.create')
    expect(mocks.requireAccess).not.toHaveBeenCalled()
  })

  it('creates the label scoped to the authorized organization', async () => {
    const response = await createLabelRoute(
      request('/api/labels', { name: 'bug' })
    )

    expect(response.status).toBe(201)
    expect(mocks.createLabel).toHaveBeenCalledWith('org_1', { name: 'bug' })
  })

  it('rejects a colour that is not a hex value', async () => {
    const response = await createLabelRoute(
      request('/api/labels', { name: 'bug', color: 'red' })
    )

    expect(response.status).toBe(422)
    expect(mocks.createLabel).not.toHaveBeenCalled()
  })

  it('never calls the client when denied', async () => {
    mocks.requirePermission.mockResolvedValue({
      response: new Response('{}', { status: 403 }),
    })

    await createLabelRoute(request('/api/labels', { name: 'bug' }))

    expect(mocks.createLabel).not.toHaveBeenCalled()
  })
})
