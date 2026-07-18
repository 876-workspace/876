import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/876', () => ({
  $876: {
    features: {
      retrieve: mocks.retrieve,
      update: mocks.update,
    },
  },
}))

import { PATCH } from './route'

const context = { params: Promise.resolve({ id: 'feature_widget' }) }

function request(body: unknown) {
  return new Request(
    'http://console.test/api/widgets/features/feature_widget',
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  ) as NextRequest
}

describe('widget feature route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      caller: { id: 'user_admin' },
      response: null,
    })
  })

  it('updates only the enabled state of a widget-tagged feature', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'feature_widget', tags: ['widget'] },
      error: null,
    })
    mocks.update.mockResolvedValue({
      data: { id: 'feature_widget', enabled: false },
      error: null,
    })

    const response = await PATCH(request({ enabled: false }), context)

    expect(response.status).toBe(200)
    expect(mocks.requirePermission).toHaveBeenCalledWith('console:widgets')
    expect(mocks.update).toHaveBeenCalledWith('feature_widget', {
      enabled: false,
    })
  })

  it('does not let widget administrators update ordinary feature flags', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'feature_other', tags: [] },
      error: null,
    })

    const response = await PATCH(request({ enabled: true }), context)

    expect(response.status).toBe(404)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects fields other than enabled', async () => {
    const response = await PATCH(
      request({ enabled: true, app_id: 'app_other' }),
      context
    )

    expect(response.status).toBe(400)
    expect(mocks.retrieve).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
