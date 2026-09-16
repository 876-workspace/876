import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  addAttendee: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { events: { addAttendee: mocks.addAttendee } },
}))

const { POST } = await import('./route')

function context(eventId = 'evt_1') {
  return { params: Promise.resolve({ eventId }) }
}

function request(body: unknown) {
  return new Request('http://localhost/api/events/evt_1/attendees', {
    method: 'POST',
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
  mocks.addAttendee.mockResolvedValue({
    data: { object: 'projects.event-attendee', id: 'att_1', userId: 'usr_2' },
    error: null,
  })
})

describe('POST /api/events/[eventId]/attendees', () => {
  it('requires the projects edit permission', async () => {
    await POST(request({ userId: 'usr_2' }), context())

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('invites the member on the decoded event', async () => {
    const response = await POST(
      request({ userId: 'usr_2', response: 'accepted' }),
      context('evt%2F1')
    )

    expect(response.status).toBe(201)
    expect(mocks.addAttendee).toHaveBeenCalledWith('org_1', 'evt/1', {
      userId: 'usr_2',
      response: 'accepted',
    })
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.event-attendee', id: 'att_1', userId: 'usr_2' },
      error: null,
    })
  })

  it('rejects an invite with no member', async () => {
    const response = await POST(request({ userId: '  ' }), context())

    expect(response.status).toBe(422)
    expect(mocks.addAttendee).not.toHaveBeenCalled()
  })

  it('rejects an unknown response value', async () => {
    const response = await POST(
      request({ userId: 'usr_2', response: 'maybe' }),
      context()
    )

    expect(response.status).toBe(422)
    expect(mocks.addAttendee).not.toHaveBeenCalled()
  })

  it('reports an existing attendee as 409', async () => {
    mocks.addAttendee.mockResolvedValue({
      data: null,
      error: { code: 'projects/attendee-exists', message: 'Already invited.' },
    })

    const response = await POST(request({ userId: 'usr_2' }), context())

    expect(response.status).toBe(409)
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request({ userId: 'usr_2' }), context())

    expect(response.status).toBe(403)
    expect(mocks.addAttendee).not.toHaveBeenCalled()
  })
})
