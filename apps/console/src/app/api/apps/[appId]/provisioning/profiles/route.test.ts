import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireConsolePermission: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requireConsolePermission,
}))

vi.mock('@/lib/services/platform', () => ({
  platform: {
    provisioning: {
      applicationProfiles: {
        list: mocks.list,
        create: mocks.create,
      },
    },
  },
}))

import { GET, POST } from './route'

const context = {
  params: Promise.resolve({ appId: 'rap_crm' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireConsolePermission.mockResolvedValue({ response: null })
})

describe('Console application provisioning profile collection route', () => {
  it('requires console:apps and unwraps the Platform list envelope', async () => {
    mocks.list.mockResolvedValue({
      data: {
        object: 'list',
        data: [
          {
            object: 'application_provisioning_profile',
            id: 'apppr_default',
            key: 'default',
          },
        ],
        has_more: false,
        url: '/provisioning/apps/rap_crm/profiles',
        total_count: 1,
      },
      error: null,
    })

    const response = await GET(
      new NextRequest('https://console.test/api/apps/rap_crm/provisioning/profiles'),
      context
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          object: 'application_provisioning_profile',
          id: 'apppr_default',
          key: 'default',
        },
      ],
      error: null,
    })
    expect(mocks.requireConsolePermission).toHaveBeenCalledOnce()
    expect(mocks.requireConsolePermission).toHaveBeenCalledWith('console:apps')
    expect(mocks.list).toHaveBeenCalledOnce()
    expect(mocks.list).toHaveBeenCalledWith('rap_crm')
  })

  it('forwards a valid create payload only after authorization', async () => {
    const body = {
      key: 'jamaica',
      name: 'Jamaica',
      description: 'Jamaica defaults',
      copy_from: 'default',
    }
    mocks.create.mockResolvedValue({
      data: {
        object: 'application_provisioning_profile',
        id: 'apppr_jamaica',
        app_id: 'rap_crm',
        app_slug: '876-crm',
        ...body,
      },
      error: null,
    })

    const response = await POST(
      new NextRequest(
        'https://console.test/api/apps/rap_crm/provisioning/profiles',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      ),
      context
    )

    expect(response.status).toBe(201)
    expect(mocks.requireConsolePermission).toHaveBeenCalledWith('console:apps')
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(mocks.create).toHaveBeenCalledWith('rap_crm', body)
  })

  it('does not call Platform when authorization returns a response', async () => {
    mocks.requireConsolePermission.mockResolvedValue({
      response: new Response('forbidden', { status: 403 }),
    })

    const response = await GET(
      new NextRequest('https://console.test/api/apps/rap_crm/provisioning/profiles'),
      context
    )

    expect(response.status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
