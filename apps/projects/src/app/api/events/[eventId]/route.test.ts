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
  projects: { events: { update: mocks.update, delete: mocks.remove } },
}))

const { PATCH, DELETE } = await import('./route')

type Context = { params: Promise<{ eventId: string }> }

function context(eventId = 'evt_1'): Context {
  return { params: Promise.resolve({ eventId }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/events/evt_1', {
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
    data: { object: 'projects.event', id: 'evt_1' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.event', id: 'evt_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/events/[eventId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(request({ title: 'Moved review' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('updates the decoded event and returns the success envelope', async () => {
    const response = await PATCH(
      request({ title: 'Moved review', recurrence: null }),
      context('evt%2F1')
    )

    expect(mocks.update).toHaveBeenCalledWith('org_1', 'evt/1', {
      title: 'Moved review',
      recurrence: null,
    })
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.event', id: 'evt_1' },
      error: null,
    })
  })

  it('rejects an empty update rather than sending a no-op', async () => {
    const response = await PATCH(request({}), context())

    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('reports a missing event as 404', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'projects/event-not-found', message: 'No such event.' },
    })

    const response = await PATCH(request({ title: 'Gone' }), context())

    expect(response.status).toBe(404)
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await PATCH(request({ title: 'Moved review' }), context())

    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/events/[eventId]', () => {
  it('deletes the decoded event and returns the tombstone envelope', async () => {
    const response = await DELETE(new Request('http://localhost/api/events/evt_1'), context())

    expect(mocks.remove).toHaveBeenCalledWith('org_1', 'evt_1')
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.event', id: 'evt_1', deleted: true },
      error: null,
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(
      new Request('http://localhost/api/events/evt_1'),
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
