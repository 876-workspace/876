import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  linksList: vi.fn(),
  linksCreate: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/storage', () => ({
  storage: {
    uploads: { create: vi.fn(), complete: vi.fn() },
    files: {},
    resourceLinks: {
      list: mocks.linksList,
      create: mocks.linksCreate,
      delete: vi.fn(),
    },
  },
}))

const { POST } = await import('./route')

const link = {
  object: 'resource_link' as const,
  id: 'rlink_1',
  file_id: 'file_1',
  app_id: '876-projects',
  resource_type: 'project',
  resource_id: 'prj_1',
  relation: 'attachment',
  created_by: 'usr_1',
  created_at: 1_700_000_000,
}

function request(body: unknown) {
  return new Request('http://localhost/api/attachments/link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    fileId: 'file_1',
    resourceType: 'project',
    resourceId: 'prj_1',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.linksList.mockResolvedValue({
    data: { object: 'list', data: [] },
    error: null,
  })
  mocks.linksCreate.mockResolvedValue({ data: link, error: null })
})

describe('POST /api/attachments/link', () => {
  it('requires projects.edit for a project record', async () => {
    await POST(request(validBody()))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('requires issues.edit for a work item record', async () => {
    await POST(
      request(validBody({ resourceType: 'issue', resourceId: 'iss_1' }))
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('links an existing file under this app and relation', async () => {
    const response = await POST(request(validBody()))

    expect(mocks.linksCreate).toHaveBeenCalledWith(
      {
        file_id: 'file_1',
        app_id: '876-projects',
        resource_type: 'project',
        resource_id: 'prj_1',
        relation: 'attachment',
        owner_type: 'organization',
        owner_id: 'org_1',
        actor_user_id: 'usr_1',
      },
      { sourceAppId: '876-projects', actorUserId: 'usr_1', actorOrgId: 'org_1' }
    )
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { linkId: 'rlink_1', fileId: 'file_1' },
      error: null,
    })
  })

  it('scopes the duplicate check to the record being linked', async () => {
    await POST(request(validBody()))

    expect(mocks.linksList).toHaveBeenCalledWith(
      {
        app_id: '876-projects',
        resource_type: 'project',
        resource_id: 'prj_1',
        relation: 'attachment',
      },
      { sourceAppId: '876-projects', actorUserId: 'usr_1', actorOrgId: 'org_1' }
    )
  })

  it('does not link the same file twice', async () => {
    mocks.linksList.mockResolvedValue({
      data: { object: 'list', data: [{ ...link, id: 'rlink_existing' }] },
      error: null,
    })

    const response = await POST(request(validBody()))

    expect(mocks.linksCreate).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      data: { linkId: 'rlink_existing', fileId: 'file_1' },
      error: null,
    })
  })

  it.each([
    ['a bare project id', 'prj_1'],
    ['an empty id', ''],
    ['a path', 'file_1/extra'],
  ])('rejects %s as a file id', async (_label, fileId) => {
    const response = await POST(request(validBody({ fileId })))

    expect(response.status).toBe(422)
    expect(mocks.linksCreate).not.toHaveBeenCalled()
  })

  it('rejects a body that names its own owner', async () => {
    const response = await POST(request(validBody({ owner_id: 'org_2' })))

    expect(response.status).toBe(422)
    expect(mocks.linksCreate).not.toHaveBeenCalled()
  })

  it('returns authorization failures without reading the record links', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(403)
    expect(mocks.linksList).not.toHaveBeenCalled()
  })

  it('passes Storage’s refusal of a foreign file through as forbidden', async () => {
    mocks.linksCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/forbidden',
        message: 'This file does not belong to that organization.',
      },
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'storage/forbidden',
        message: 'This file does not belong to that organization.',
      },
    })
  })

  it('reports an unreadable file as not found', async () => {
    mocks.linksCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/file-not-found',
        message: 'That file could not be found.',
      },
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(404)
  })
})
