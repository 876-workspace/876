import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  invite: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    clientGrants: { invite: mocks.invite, revoke: mocks.revoke },
  },
}))

const { POST } = await import('./route')
const { POST: revoke } = await import('./[grantId]/revoke/route')

function inviteRequest(body: unknown) {
  return new Request('http://localhost/api/projects/prj_1/client-grants', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function revokeRequest() {
  return new Request(
    'http://localhost/api/projects/prj_1/client-grants/grant_1/revoke',
    { method: 'POST' }
  )
}

const context = { params: Promise.resolve({ projectId: 'prj_1' }) }
const revokeContext = {
  params: Promise.resolve({ projectId: 'prj_1', grantId: 'grant_1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.invite.mockResolvedValue({
    data: { object: 'projects.client-grant', id: 'grant_1' },
    error: null,
  })
  mocks.revoke.mockResolvedValue({
    data: { object: 'projects.client-grant', id: 'grant_1' },
    error: null,
  })
})

describe('POST /api/projects/[projectId]/client-grants', () => {
  it('requires the projects edit permission', async () => {
    await POST(inviteRequest({ userId: 'usr_client' }), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('records the session user as the inviter', async () => {
    const response = await POST(
      inviteRequest({ userId: 'usr_client', allowDiscussions: true }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.invite).toHaveBeenCalledWith('org_1', 'prj_1', {
      userId: 'usr_client',
      allowDiscussions: true,
      invitedBy: 'usr_1',
    })
  })

  it('rejects invites without an existing member user id', async () => {
    const response = await POST(inviteRequest({}), context)

    expect(response.status).toBe(422)
    expect(mocks.invite).not.toHaveBeenCalled()
  })
})

describe('POST /api/projects/[projectId]/client-grants/[grantId]/revoke', () => {
  it('revokes through the internal client', async () => {
    const response = await revoke(revokeRequest(), revokeContext)

    expect(response.status).toBe(200)
    expect(mocks.revoke).toHaveBeenCalledWith('org_1', 'prj_1', 'grant_1')
  })

  it('maps a missing grant to 404', async () => {
    mocks.revoke.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/client-grant-not-found',
        message: 'Not found.',
      },
    })

    const response = await revoke(revokeRequest(), revokeContext)

    expect(response.status).toBe(404)
  })
})
