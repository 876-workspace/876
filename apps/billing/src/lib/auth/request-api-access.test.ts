import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  hasPermission: vi.fn(),
  getFeatures: vi.fn(),
}))

vi.mock('./billing-context', () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
  hasPermission: mocks.hasPermission,
}))
vi.mock('@/lib/features', () => ({
  getFeatures: mocks.getFeatures,
}))

import { requireRequestApiAccess } from './request-api-access'

const context = {
  userId: 'user_1',
  orgId: 'org_1',
  tenant: { id: 'tenant_1' },
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getWorkspaceContext.mockResolvedValue(context)
  mocks.hasPermission.mockReturnValue(true)
  mocks.getFeatures.mockResolvedValue({
    productFeatures: { requests: true },
  })
})

describe('requireRequestApiAccess', () => {
  it('denies when the Billing permission is missing', async () => {
    mocks.hasPermission.mockReturnValue(false)

    const result = await requireRequestApiAccess('customers:write')

    expect(result.response?.status).toBe(403)
    expect(mocks.getFeatures).not.toHaveBeenCalled()
  })

  it('denies when Requests is disabled for the organization', async () => {
    mocks.getFeatures.mockResolvedValue({
      productFeatures: { requests: false },
    })

    const result = await requireRequestApiAccess('customers:read')

    expect(result.response?.status).toBe(403)
    expect(mocks.getFeatures).toHaveBeenCalledWith({
      userId: 'user_1',
      organizationId: 'org_1',
    })
  })

  it('returns the workspace context when permission and feature allow access', async () => {
    const result = await requireRequestApiAccess('customers:read')

    expect(result).toEqual({ response: null, context })
  })
})
