import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { timeEntries: { update: mocks.update, delete: mocks.remove } },
}))

const { DELETE, PATCH } = await import('./route')

const context = { params: Promise.resolve({ timeEntryId: 'tme_1' }) }

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/time-entries/tme_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const EDIT = {
  startedAt: 1788400000,
  endedAt: 1788407200,
  billable: false,
  note: 'Corrected to the afternoon',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/time-entries/[timeEntryId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(patchRequest(EDIT), context)

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('attributes the edit to the session user', async () => {
    const response = await PATCH(patchRequest(EDIT), context)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_1', 'tme_1', 'usr_1', EDIT)
  })

  it('rejects a body with no times at all', async () => {
    const response = await PATCH(patchRequest({ billable: true }), context)

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('maps a locked entry to 409', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-entry-locked',
        message: 'That entry is on a submitted timesheet.',
      },
    })

    const response = await PATCH(patchRequest(EDIT), context)

    expect(response.status).toBe(409)
  })

  it('maps another user’s entry to 403', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-entry-forbidden',
        message: 'That entry belongs to someone else.',
      },
    })

    const response = await PATCH(patchRequest(EDIT), context)

    expect(response.status).toBe(403)
  })

  it('answers the authorization failure without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await PATCH(patchRequest(EDIT), context)

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/time-entries/[timeEntryId]', () => {
  it('deletes as the session user', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/time-entries/tme_1', {
        method: 'DELETE',
      }),
      context
    )

    expect(response.status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'tme_1', 'usr_1')
  })

  it('returns the deletion in the data envelope', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/time-entries/tme_1', {
        method: 'DELETE',
      }),
      context
    )

    expect(await response.json()).toEqual({
      data: { object: 'projects.time-entry', id: 'tme_1', deleted: true },
      error: null,
    })
  })

  it('maps an unknown entry to 404', async () => {
    mocks.remove.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-entry-not-found',
        message: 'That entry does not exist.',
      },
    })

    const response = await DELETE(
      new Request('http://localhost/api/time-entries/tme_1', {
        method: 'DELETE',
      }),
      context
    )

    expect(response.status).toBe(404)
  })

  it('does not delete when the caller holds no session', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    })

    const response = await DELETE(
      new Request('http://localhost/api/time-entries/tme_1', {
        method: 'DELETE',
      }),
      context
    )

    expect(response.status).toBe(401)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
