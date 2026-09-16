import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  uploadsCreate: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/storage', () => ({
  storage: {
    uploads: { create: mocks.uploadsCreate, complete: vi.fn() },
    files: {},
    resourceLinks: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}))

const { POST } = await import('./route')

const session = {
  object: 'upload_session' as const,
  id: 'upl_1',
  file_id: 'file_1',
  upload_url: 'https://r2.example.test/signed',
  method: 'PUT' as const,
  headers: { 'Content-Type': 'application/pdf', 'Content-Length': '2048' },
  expires_at: 1_700_000_600,
}

function request(body: unknown) {
  return new Request('http://localhost/api/attachments/upload-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    resourceType: 'issue',
    resourceId: 'iss_1',
    fileName: 'plan.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2048,
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
  mocks.uploadsCreate.mockResolvedValue({ data: session, error: null })
})

describe('POST /api/attachments/upload-session', () => {
  it('requires issues.edit to attach to a work item', async () => {
    await POST(request(validBody()))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it.each(['project', 'milestone', 'task-list', 'comment'])(
    'requires projects.edit to attach to a %s',
    async (resourceType) => {
      await POST(request(validBody({ resourceType })))

      expect(mocks.requireAccess).toHaveBeenCalledWith({
        module: 'projects',
        permission: 'projects.edit',
      })
    }
  )

  it('opens the session on the projects route with the session actor and organization', async () => {
    await POST(request(validBody({ sizeBytes: 3072, contentType: 'text/csv' })))

    expect(mocks.uploadsCreate).toHaveBeenCalledWith({
      route_key: 'projects.attachment',
      owner_type: 'organization',
      owner_id: 'org_1',
      actor_user_id: 'usr_1',
      source_app_id: '876-projects',
      file_name: 'plan.pdf',
      content_type: 'text/csv',
      size_bytes: 3072,
    })
  })

  it('returns the signed session to the browser', async () => {
    const response = await POST(request(validBody()))

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: {
        sessionId: 'upl_1',
        fileId: 'file_1',
        uploadUrl: 'https://r2.example.test/signed',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '2048',
        },
        expiresAt: 1_700_000_600,
      },
      error: null,
    })
  })

  it('rejects a body that tries to choose the actor or the owner', async () => {
    const response = await POST(
      request(validBody({ actor_user_id: 'usr_attacker', owner_id: 'org_2' }))
    )

    expect(response.status).toBe(422)
    expect(mocks.uploadsCreate).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5])(
    'rejects a declared size of %s before opening a session',
    async (sizeBytes) => {
      const response = await POST(request(validBody({ sizeBytes })))

      expect(response.status).toBe(422)
      expect(mocks.uploadsCreate).not.toHaveBeenCalled()
    }
  )

  it('rejects a resource type Storage has no attachment policy for', async () => {
    const response = await POST(request(validBody({ resourceType: 'invoice' })))

    expect(response.status).toBe(422)
    expect(mocks.uploadsCreate).not.toHaveBeenCalled()
  })

  it('returns authorization failures without opening a session', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(403)
    expect(mocks.uploadsCreate).not.toHaveBeenCalled()
  })

  it('carries a forbidden MIME type through as 415 with the Storage code', async () => {
    mocks.uploadsCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/mime-not-allowed',
        message: 'That file type is not allowed for this route.',
      },
    })

    const response = await POST(
      request(validBody({ contentType: 'image/svg+xml' }))
    )

    expect(response.status).toBe(415)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'storage/mime-not-allowed',
        message: 'That file type is not allowed for this route.',
      },
    })
  })

  it('reports a missing internal key as a gateway failure, not a bad request', async () => {
    mocks.uploadsCreate.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/not-configured',
        message: 'Configure the Storage service internal key.',
      },
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(502)
  })
})
