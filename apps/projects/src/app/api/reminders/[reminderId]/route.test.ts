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
  projects: { reminders: { update: mocks.update, delete: mocks.remove } },
}))

const { PATCH, DELETE } = await import('./route')

function context(reminderId = 'rem_1') {
  return { params: Promise.resolve({ reminderId }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/reminders/rem_1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.update.mockResolvedValue({
    data: { object: 'projects.reminder', id: 'rem_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.reminder', id: 'rem_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/reminders/[reminderId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(request({ offsetMinutesBeforeDue: 60 }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('scopes the update to the acting user', async () => {
    const response = await PATCH(
      request({ offsetMinutesBeforeDue: 60 }),
      context('rem%2F1')
    )

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'rem/1', 'usr_1', {
      offsetMinutesBeforeDue: 60,
    })
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.reminder', id: 'rem_1' },
      error: null,
    })
  })

  it('rejects an empty update rather than sending a no-op', async () => {
    const response = await PATCH(request({}), context())

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('reports someone else\u2019s reminder as forbidden', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/reminder-forbidden',
        message: 'This reminder belongs to someone else.',
      },
    })

    const response = await PATCH(request({ active: false }), context())

    expect(response.status).toBe(403)
  })

  it('reports a missing reminder as 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'projects/reminder-not-found', message: 'No such reminder.' },
    })

    const response = await PATCH(request({ active: false }), context())

    expect(response.status).toBe(404)
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await PATCH(request({ active: false }), context())

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/reminders/[reminderId]', () => {
  it('scopes the delete to the acting user', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/reminders/rem_1'),
      context()
    )

    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'rem_1', 'usr_1')
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.reminder', id: 'rem_1', deleted: true },
      error: null,
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(
      new Request('http://localhost/api/reminders/rem_1'),
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
