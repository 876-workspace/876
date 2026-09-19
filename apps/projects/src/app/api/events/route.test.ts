import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/projects', () => ({
  projects: { events: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody() {
  return {
    projectId: 'prj_1',
    kind: 'meeting',
    title: 'Design review',
    description: 'Walk the calendar work.',
    startsAt: 1789894800,
    endsAt: 1789898400,
    allDay: false,
    location: 'Room 2',
    meetingUrl: 'https://meet.example.com/design',
    recurrence: { freq: 'weekly', interval: 2, byWeekday: [0, 2] },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.event', id: 'evt_1' },
    error: null,
  })
})

describe('POST /api/events', () => {
  it('requires the projects edit permission', async () => {
    await POST(request(validBody()))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('returns the created event in the success envelope', async () => {
    const response = await POST(request(validBody()))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.event', id: 'evt_1' },
      error: null,
    })
  })

  it('binds the creator from the session, never from the body', async () => {
    await POST(request(validBody()))

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      ...validBody(),
      createdBy: 'usr_1',
    })
  })

  it('rejects a body that tries to choose the creator', async () => {
    const response = await POST(
      request({ ...validBody(), createdBy: 'usr_attacker' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an end before the start', async () => {
    const response = await POST(
      request({ ...validBody(), startsAt: 1789898400, endsAt: 1789894800 })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown recurrence frequency', async () => {
    const response = await POST(
      request({ ...validBody(), recurrence: { freq: 'fortnightly' } })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an event with no title', async () => {
    const response = await POST(request({ ...validBody(), title: '  ' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorization failures without touching the service', async () => {
    mocks.requireAccess.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    })

    const response = await POST(request(validBody()))

    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
