import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireWorkWidgetPermission } from './work-widget-access'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  getFeatures: vi.fn(),
}))

vi.mock('./api-permission', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))
vi.mock('@/lib/features', () => ({ getFeatures: mocks.getFeatures }))

describe('requireWorkWidgetPermission', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.requireApiPermission.mockResolvedValue({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    mocks.getFeatures.mockResolvedValue({
      featureKeys: [],
      uiFeatures: {},
      widgets: { enabledWidgetIds: ['work'] },
    })
  })

  it('forwards the exact host permission requirement', async () => {
    const result = await requireWorkWidgetPermission('tasks.edit')

    expect(mocks.requireApiPermission).toHaveBeenCalledWith('tasks.edit')
    expect(result).toEqual({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
  })

  it('returns authorization failures before resolving features', async () => {
    const response = Response.json(
      { data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } },
      { status: 403 }
    )
    mocks.requireApiPermission.mockResolvedValue({ response })

    const result = await requireWorkWidgetPermission('my-work.view')

    expect(result).toEqual({ response })
    expect(mocks.getFeatures).not.toHaveBeenCalled()
  })

  it('resolves features for the authenticated user and organization', async () => {
    await requireWorkWidgetPermission('my-work.view')

    expect(mocks.getFeatures).toHaveBeenCalledWith({
      userId: 'user_1',
      organizationId: 'org_1',
    })
  })

  it('fails closed when the Work widget rollout is disabled', async () => {
    mocks.getFeatures.mockResolvedValue({
      featureKeys: [],
      uiFeatures: {},
      widgets: { enabledWidgetIds: [] },
    })

    const result = await requireWorkWidgetPermission('my-work.view')
    const response = result.response

    expect(response).not.toBeNull()
    expect(response?.status).toBe(404)
    await expect(response?.json()).resolves.toEqual({
      data: null,
      error: {
        code: 'work/not-found',
        message: 'Not found.',
      },
    })
  })
})