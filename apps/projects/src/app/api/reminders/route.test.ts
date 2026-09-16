import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/projects', () => ({
  projects: { reminders: { create: mocks.create } },
}))

const { POST } = await import('./route')

function request(body: unknown) {
  return new Request('http://localhost/api/reminders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody() {
  return { issueId: 'iss_1', offsetMinutesBeforeDue: 120 }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({
    response: null,
    orgId: 'org_1',
    userId: 'usr_1',
  })
  mocks.create.mockResolvedValue({
    data: { object: 'projects.reminder', id: 'rem_1' },
    error: null,
  })
})

describe('POST /api/reminders', () => {
  it('requires the projects edit permission', async () => {
    await POST(request(validBody()))

    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the reminder in the success envelope', async () => {
    const response = await POST(request(validBody()))

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      data: { object: 'projects.reminder', id: 'rem_1' },
      error: null,
    })
  })

  it('binds the owner from the session, never from the body', async () => {
    await POST(request(validBody()))

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      ...validBody(),
      createdBy: 'usr_1',
    })
  })

  it('rejects a body that tries to choose the owner', async () => {
    const response = await POST(
      request({ ...validBody(), createdBy: 'usr_attacker' })
    )

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a reminder with no record to sit on', async () => {
    const response = await POST(request({ offsetMinutesBeforeDue: 120 }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a reminder with no time', async () => {
    const response = await POST(request({ issueId: 'iss_1' }))

    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a channel other than in-app', async () => {
    const response = await POST(request({ ...validBody(), channel: 'email' }))

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
