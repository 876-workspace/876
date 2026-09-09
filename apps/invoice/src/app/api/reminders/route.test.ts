import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

const mocks = vi.hoisted(() => ({
  requireWorkWidgetPermission: vi.fn(),
  getWork: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/work-widget-access', () => ({
  requireWorkWidgetPermission: mocks.requireWorkWidgetPermission,
}))
vi.mock('@/lib/services/work', () => ({ getWork: mocks.getWork }))

const REMINDER = {
  object: 'reminder' as const,
  id: 'reminder_1',
  title: 'Call customer',
}

function request(body: unknown) {
  return new Request('http://invoice.test/api/reminders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/reminders', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getWork.mockResolvedValue({ reminders: { create: mocks.create } })
    mocks.create.mockResolvedValue({ data: REMINDER, error: null })
  })

  it('requires reminders.create before creating Work reminders', async () => {
    await POST(
      request({
        title: 'Call customer',
        remindAt: 200,
        timeZone: 'America/New_York',
      })
    )

    expect(mocks.requireWorkWidgetPermission).toHaveBeenCalledWith(
      'reminders.create'
    )
  })

  it('returns authorization failures before creating a Work client', async () => {
    mocks.requireWorkWidgetPermission.mockResolvedValue({
      response: Response.json(
        { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
        { status: 403 }
      ),
    })

    const response = await POST(request({}))

    expect(response.status).toBe(403)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('stamps reminders with the acting user', async () => {
    const response = await POST(
      request({
        title: 'Call customer',
        note: 'Ask about the quote',
        remindAt: 200,
        timeZone: 'America/New_York',
      })
    )
    const payload = await response.json()

    expect(mocks.create).toHaveBeenCalledWith('org_1', {
      title: 'Call customer',
      note: 'Ask about the quote',
      remindAt: 200,
      timeZone: 'America/New_York',
      userId: 'user_1',
      createdBy: 'user_1',
    })
    expect(payload).toEqual({ data: REMINDER, error: null })
  })

  it('rejects browser-owned user identity and malformed reminder data', async () => {
    const identityResponse = await POST(
      request({
        title: 'Call customer',
        remindAt: 200,
        userId: 'user_2',
      })
    )
    const invalidResponse = await POST(
      request({ title: '', remindAt: -1 })
    )

    expect(identityResponse.status).toBe(422)
    expect(invalidResponse.status).toBe(422)
    expect(mocks.getWork).not.toHaveBeenCalled()
  })

  it('sanitizes unknown upstream reminder failures', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'provider/raw-error', message: 'provider detail' },
    })

    const response = await POST(
      request({ title: 'Call customer', remindAt: 200 })
    )
    const payload = await response.json()

    expect(response.status).toBe(502)
    expect(payload.error.code).toBe('work/invalid-response')
  })
})
