import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireWidgetsService } from './service-key'

function request(headers: Record<string, string>) {
  return new Request('http://widgets-api.test/api/v1/notes', {
    headers,
  })
}

describe('requireWidgetsService', () => {
  const originalKey = process.env.WIDGETS_SERVICE_KEY

  beforeEach(() => {
    process.env.WIDGETS_SERVICE_KEY = 'widgets_service_test_key_32chars!!'
  })

  afterEach(() => {
    if (originalKey === undefined) delete process.env.WIDGETS_SERVICE_KEY
    else process.env.WIDGETS_SERVICE_KEY = originalKey
  })

  it('when service key is missing from the environment, then returns 503', async () => {
    delete process.env.WIDGETS_SERVICE_KEY

    const auth = requireWidgetsService(request({}))

    expect(auth.response).not.toBeNull()
    expect(auth.response?.status).toBe(503)
    expect(auth.actorUserId).toBeNull()
  })

  it('when the internal key is wrong, then returns 401 unauthorized', async () => {
    const auth = requireWidgetsService(
      request({
        'x-internal-key': 'wrong-key',
        'x-876-actor-user-id': 'user_alejandra',
      })
    )

    expect(auth.response?.status).toBe(401)
    expect(auth.actorUserId).toBeNull()
  })

  it('when actor identity is missing, then returns 400', async () => {
    const auth = requireWidgetsService(
      request({
        'x-internal-key': 'widgets_service_test_key_32chars!!',
      })
    )

    expect(auth.response?.status).toBe(400)
    const body = await auth.response!.json()
    expect(body.error?.message ?? body.error).toMatch(/actor/i)
  })

  it('when admin is required but role header is absent, then returns 403', async () => {
    const auth = requireWidgetsService(
      request({
        'x-internal-key': 'widgets_service_test_key_32chars!!',
        'x-876-actor-user-id': 'user_alejandra',
      }),
      { admin: true }
    )

    expect(auth.response?.status).toBe(403)
  })

  it('when credentials and actor are valid for a member call, then authorizes the actor', () => {
    const auth = requireWidgetsService(
      request({
        'x-internal-key': 'widgets_service_test_key_32chars!!',
        'x-876-actor-user-id': 'user_alejandra',
      })
    )

    expect(auth.response).toBeNull()
    expect(auth.actorUserId).toBe('user_alejandra')
    expect(auth.isAdmin).toBe(false)
  })

  it('when admin role header is present, then marks the caller as admin', () => {
    const auth = requireWidgetsService(
      request({
        'x-internal-key': 'widgets_service_test_key_32chars!!',
        'x-876-actor-user-id': 'user_console_admin',
        'x-876-widget-role': 'admin',
      }),
      { admin: true }
    )

    expect(auth.response).toBeNull()
    expect(auth.actorUserId).toBe('user_console_admin')
    expect(auth.isAdmin).toBe(true)
  })
})
