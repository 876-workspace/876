import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  linksList: vi.fn(),
  linksDelete: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/storage', () => ({
  storage: {
    uploads: { create: vi.fn(), complete: vi.fn() },
    files: {},
    resourceLinks: {
      list: mocks.linksList,
      create: vi.fn(),
      delete: mocks.linksDelete,
    },
  },
}))

const { DELETE } = await import('./route')

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

function request(query: string) {
  return new Request(`http://localhost/api/attachments/link/rlink_1${query}`, {
    method: 'DELETE',
  })
}

const context = { params: Promise.resolve({ linkId: 'rlink_1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.linksList.mockResolvedValue({
    data: { object: 'list', data: [link] },
    error: null,
  })
  mocks.linksDelete.mockResolvedValue({
    data: { object: 'resource_link', id: 'rlink_1', deleted: true },
    error: null,
  })
})

describe('DELETE /api/attachments/link/[linkId]', () => {
  it('requires issues.edit when the link hangs off a work item', async () => {
    await DELETE(request('?resourceType=issue&resourceId=iss_1'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'issues',
      permission: 'issues.edit',
    })
  })

  it('requires projects.edit when the link hangs off a project record', async () => {
    await DELETE(request('?resourceType=project&resourceId=prj_1'), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('checks the link against the record’s own links before removing it', async () => {
    await DELETE(request('?resourceType=issue&resourceId=iss_1'), context)

    expect(mocks.linksList).toHaveBeenCalledWith(
      {
        app_id: '876-projects',
        resource_type: 'issue',
        resource_id: 'iss_1',
        relation: 'attachment',
      },
      { sourceAppId: '876-projects', actorUserId: 'usr_1', actorOrgId: 'org_1' }
    )
    expect(mocks.linksDelete).toHaveBeenCalledWith('rlink_1', {
      sourceAppId: '876-projects',
      actorUserId: 'usr_1',
      actorOrgId: 'org_1',
    })
  })

  it('removes only the link and answers with the tombstone', async () => {
    const response = await DELETE(
      request('?resourceType=issue&resourceId=iss_1'),
      context
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { object: 'resource_link', id: 'rlink_1', deleted: true },
      error: null,
    })
  })

  it('refuses a link that is not on this record', async () => {
    mocks.linksList.mockResolvedValue({
      data: { object: 'list', data: [{ ...link, id: 'rlink_other' }] },
      error: null,
    })

    const response = await DELETE(
      request('?resourceType=issue&resourceId=iss_1'),
      context
    )

    expect(response.status).toBe(404)
    expect(mocks.linksDelete).not.toHaveBeenCalled()
  })

  it('refuses an empty record list rather than deleting blind', async () => {
    mocks.linksList.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })

    const response = await DELETE(
      request('?resourceType=issue&resourceId=iss_1'),
      context
    )

    expect(response.status).toBe(404)
    expect(mocks.linksDelete).not.toHaveBeenCalled()
  })

  it.each([
    ['no record reference', ''],
    ['an unknown resource type', '?resourceType=invoice&resourceId=inv_1'],
    ['a blank resource id', '?resourceType=issue&resourceId='],
  ])('rejects a request with %s', async (_label, query) => {
    const response = await DELETE(request(query), context)

    expect(response.status).toBe(422)
    expect(mocks.linksList).not.toHaveBeenCalled()
    expect(mocks.linksDelete).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the links', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(
      request('?resourceType=issue&resourceId=iss_1'),
      context
    )

    expect(response.status).toBe(403)
    expect(mocks.linksList).not.toHaveBeenCalled()
    expect(mocks.linksDelete).not.toHaveBeenCalled()
  })

  it('reports a Storage outage as a gateway failure', async () => {
    mocks.linksList.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })

    const response = await DELETE(
      request('?resourceType=issue&resourceId=iss_1'),
      context
    )

    expect(response.status).toBe(502)
  })

  it('reports a link Storage no longer has as not found', async () => {
    mocks.linksDelete.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/resource-link-not-found',
        message: 'That link no longer exists.',
      },
    })

    const response = await DELETE(
      request('?resourceType=issue&resourceId=iss_1'),
      context
    )

    expect(response.status).toBe(404)
  })
})
