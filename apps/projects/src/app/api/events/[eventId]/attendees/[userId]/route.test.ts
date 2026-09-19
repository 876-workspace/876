import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  respondAttendee: vi.fn(),
  removeAttendee: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: {
    events: {
      respondAttendee: mocks.respondAttendee,
      removeAttendee: mocks.removeAttendee,
    },
  },
}))

const { PATCH, DELETE } = await import('./route')

function context(eventId = 'evt_1', userId = 'usr_2') {
  return { params: Promise.resolve({ eventId, userId }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/events/evt_1/attendees/usr_2', {
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
  mocks.respondAttendee.mockResolvedValue({
    data: {
      object: 'projects.event-attendee',
      id: 'att_1',
      userId: 'usr_2',
      response: 'accepted',
    },
    error: null,
  })
  mocks.removeAttendee.mockResolvedValue({
    data: { object: 'projects.event-attendee', id: 'att_1', deleted: true },
    error: null,
  })
})

describe('PATCH /api/events/[eventId]/attendees/[userId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(request({ response: 'accepted' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('records the response for the decoded attendee', async () => {
    const response = await PATCH(
      request({ response: 'declined' }),
      context('evt%2F1', 'usr%2F2')
    )

    expect(mocks.respondAttendee).toHaveBeenCalledWith(
      'org_1',
      'evt/1',
      'usr/2',
      { response: 'declined' }
    )
    await expect(response.json()).resolves.toEqual({
      data: {
        object: 'projects.event-attendee',
        id: 'att_1',
        userId: 'usr_2',
        response: 'accepted',
      },
      error: null,
    })
  })

  it('refuses to write the invited default through the response route', async () => {
    const response = await PATCH(request({ response: 'invited' }), context())

    expect(response.status).toBe(422)
    expect(mocks.respondAttendee).not.toHaveBeenCalled()
  })

  it('reports an attendee that is not on the event as 404', async () => {
    mocks.respondAttendee.mockResolvedValue({
      data: null,
      error: { code: 'projects/attendee-not-found', message: 'Not invited.' },
    })

    const response = await PATCH(request({ response: 'tentative' }), context())

    expect(response.status).toBe(404)
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await PATCH(request({ response: 'accepted' }), context())

    expect(response.status).toBe(403)
    expect(mocks.respondAttendee).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/events/[eventId]/attendees/[userId]', () => {
  it('removes the decoded attendee', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/events/evt_1/attendees/usr_2'),
      context()
    )

    expect(mocks.removeAttendee).toHaveBeenCalledWith('org_1', 'evt_1', 'usr_2')
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.event-attendee', id: 'att_1', deleted: true },
      error: null,
    })
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await DELETE(
      new Request('http://localhost/api/events/evt_1/attendees/usr_2'),
      context()
    )

    expect(response.status).toBe(403)
    expect(mocks.removeAttendee).not.toHaveBeenCalled()
  })
})
