import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  uploadsComplete: vi.fn(),
  linksList: vi.fn(),
  linksCreate: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/storage', () => ({
  storage: {
    uploads: { create: vi.fn(), complete: mocks.uploadsComplete },
    files: {},
    resourceLinks: {
      list: mocks.linksList,
      create: mocks.linksCreate,
      delete: vi.fn(),
    },
  },
}))

const { POST } = await import('./route')

const readyFile = {
  object: 'file' as const,
  id: 'file_1',
  owner_type: 'organization' as const,
  owner_id: 'org_1',
  source_app_id: '876-projects',
  purpose: 'projects_attachment',
  category: 'attachment' as const,
  audience: 'organization' as const,
  status: 'ready' as const,
  original_name: 'plan.pdf',
  content_type: 'application/pdf',
  size_bytes: 2048,
  version_id: 'ver_1',
  url: null,
  created_at: 1_700_000_000,
  updated_at: 1_700_000_000,
}

const link = {
  object: 'resource_link' as const,
  id: 'rlink_1',
  file_id: 'file_1',
  app_id: '876-projects',
  resource_type: 'issue',
  resource_id: 'iss_1',
  relation: 'attachment',
  created_by: 'usr_1',
  created_at: 1_700_000_000,
}

function request(body: unknown) {
  return new Request('http://localhost/api/attachments/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function emptyList() {
  return { data: { object: 'list' as const, data: [] }, error: null }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.uploadsComplete.mockResolvedValue({ data: readyFile, error: null })
  mocks.linksList.mockResolvedValue(emptyList())
  mocks.linksCreate.mockResolvedValue({ data: link, error: null })
})

describe('POST /api/attachments/complete', () => {
  it('requires issues.edit to complete a work item attachment', async () => {
    await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('requires projects.edit to complete a phase attachment', async () => {
    await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'milestone',
        resourceId: 'ms_1',
      })
    )

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('verifies the session and links the verified file to the record', async () => {
    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(mocks.uploadsComplete).toHaveBeenCalledWith('upl_1')
    expect(mocks.linksCreate).toHaveBeenCalledWith(
      {
        file_id: 'file_1',
        app_id: '876-projects',
        resource_type: 'issue',
        resource_id: 'iss_1',
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

  it('reuses the existing link when the same file is completed twice', async () => {
    mocks.linksList.mockResolvedValue({
      data: { object: 'list', data: [{ ...link, id: 'rlink_existing' }] },
      error: null,
    })

    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(mocks.linksCreate).not.toHaveBeenCalled()
    expect(await response.json()).toEqual({
      data: { linkId: 'rlink_existing', fileId: 'file_1' },
      error: null,
    })
  })

  it.each([
    ['a file that is not ready', { status: 'pending' as const }],
    ['a file owned by another organization', { owner_id: 'org_2' }],
    ['a file another app uploaded', { source_app_id: '876-couriers' }],
  ])('refuses to link %s', async (_label, overrides) => {
    mocks.uploadsComplete.mockResolvedValue({
      data: { ...readyFile, ...overrides },
      error: null,
    })

    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(response.status).toBe(409)
    expect(mocks.linksCreate).not.toHaveBeenCalled()
  })

  it('rejects a body that names its own actor or relation', async () => {
    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
        actorUserId: 'usr_attacker',
        relation: 'library',
      })
    )

    expect(response.status).toBe(422)
    expect(mocks.uploadsComplete).not.toHaveBeenCalled()
  })

  it('returns authorization failures without completing the session', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(response.status).toBe(403)
    expect(mocks.uploadsComplete).not.toHaveBeenCalled()
  })

  it('reports an unknown or swept session as not found', async () => {
    mocks.uploadsComplete.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/upload-not-found',
        message: 'That upload session no longer exists.',
      },
    })

    const response = await POST(
      request({
        sessionId: 'upl_gone',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(response.status).toBe(404)
    expect(mocks.linksCreate).not.toHaveBeenCalled()
  })

  it('reports a leftover pending object as a conflict', async () => {
    mocks.uploadsComplete.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/upload-incomplete',
        message: 'Nothing was uploaded for this session.',
      },
    })

    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(response.status).toBe(409)
  })

  it('surfaces a link failure instead of reporting success', async () => {
    mocks.linksCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/forbidden',
        message: 'This file does not belong to that organization.',
      },
    })

    const response = await POST(
      request({
        sessionId: 'upl_1',
        resourceType: 'issue',
        resourceId: 'iss_1',
      })
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'storage/forbidden',
        message: 'This file does not belong to that organization.',
      },
    })
  })
})
