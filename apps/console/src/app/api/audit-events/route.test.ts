import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isSignedSession: vi.fn(),
  createAuditEvent: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getAuthSession: mocks.getAuthSession,
  isSignedSession: mocks.isSignedSession,
}))

vi.mock('@/lib/clients/platform', () => ({
  platform: { auditEvents: { create: mocks.createAuditEvent } },
}))

import { POST } from './route'

function request(
  body: unknown = {
    event: 'team.viewed',
    source: 'console',
    appName: 'console',
  }
) {
  return new Request('https://console.test/api/audit-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

function malformedRequest() {
  return new Request('https://console.test/api/audit-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  }) as never
}

describe('POST /api/audit-events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'user_operator' } })
    mocks.isSignedSession.mockReturnValue(true)
    mocks.createAuditEvent.mockResolvedValue({
      data: { id: 'audit_1', object: 'audit_event' },
      error: null,
    })
  })

  it('returns 401 for an unsigned session', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'Authentication required.' },
    })
  })

  it('returns the existing success envelope for a signed session', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { id: 'audit_1', object: 'audit_event' },
      error: null,
    })
  })

  it('returns 400 for a malformed body after session authorization', async () => {
    const response = await POST(malformedRequest())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'error/bad-request', message: 'Invalid request body.' },
    })
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
  })

  it('attributes the event to the signed session user instead of a body user id', async () => {
    await POST(
      request({
        event: 'team.viewed',
        source: 'console',
        appName: 'console',
        userId: 'user_forged',
      })
    )

    expect(mocks.createAuditEvent).toHaveBeenCalledWith({
      event: 'team.viewed',
      source: 'console',
      appName: 'console',
      userId: 'user_operator',
    })
  })

  it('does not call the admin audit client when the session is unsigned', async () => {
    mocks.isSignedSession.mockReturnValue(false)

    await POST(request())

    expect(mocks.createAuditEvent).not.toHaveBeenCalled()
  })

  it('calls the audit client exactly once for an authorized valid request', async () => {
    await POST(request())

    expect(mocks.createAuditEvent).toHaveBeenCalledTimes(1)
    expect(mocks.getAuthSession).toHaveBeenCalledTimes(1)
    expect(mocks.isSignedSession).toHaveBeenCalledTimes(1)
  })

  it('does not call the audit client when signed input is malformed', async () => {
    await POST(malformedRequest())

    expect(mocks.createAuditEvent).not.toHaveBeenCalled()
  })

  it('preserves the upstream error as a 502 provider envelope', async () => {
    mocks.createAuditEvent.mockResolvedValue({
      data: null,
      error: { code: 'audit/unavailable', message: 'Audit unavailable.' },
    })

    const response = await POST(request())

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'audit/unavailable', message: 'Audit unavailable.' },
    })
    expect(mocks.createAuditEvent).toHaveBeenCalledTimes(1)
  })
})
