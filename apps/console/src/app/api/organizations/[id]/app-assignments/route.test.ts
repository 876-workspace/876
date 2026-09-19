import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/clients/workspace', () => ({
  workspace: {
    appAssignments: {
      list: mocks.list,
      create: mocks.create,
    },
  },
}))

import { GET, POST } from './route'

const context = { params: Promise.resolve({ id: 'org_target' }) }

function postRequest(body: unknown) {
  return new Request(
    'http://console.test/api/organizations/org_target/app-assignments',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  ) as NextRequest
}

describe('Console organization app assignments route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      sessionUser: { id: 'user_console_admin' },
      response: null,
    })
  })

  it('unwraps the Core list envelope for the browser client', async () => {
    mocks.list.mockResolvedValue({
      data: {
        object: 'list',
        data: [
          {
            object: 'app_assignment',
            id: 'asa_1',
            organization_id: 'org_target',
            user_id: 'user_target',
            app_id: 'app_1',
          },
        ],
        has_more: false,
        url: '/organizations/org_target/app-assignments',
      },
      error: null,
    })

    const response = await GET(
      new Request(
        'http://console.test/api/organizations/org_target/app-assignments?user_id=user_target'
      ) as NextRequest,
      context
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.list).toHaveBeenCalledWith('org_target', {
      userId: 'user_target',
      appId: undefined,
      includeRevoked: false,
    })
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'asa_1', user_id: 'user_target' }),
    ])
  })

  it('maps the same-origin camelCase contract to the admin API contract', async () => {
    mocks.create.mockResolvedValue({
      data: { id: 'asa_1' },
      error: null,
    })

    const response = await POST(
      postRequest({ userId: ' user_target ', appSlug: ' couriers ' }),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith('org_target', {
      user_id: 'user_target',
      app_slug: 'couriers',
    })
  })

  it('requires exactly one app identifier', async () => {
    const response = await POST(
      postRequest({
        userId: 'user_target',
        appId: 'app_1',
        appSlug: 'couriers',
      }),
      context
    )

    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
