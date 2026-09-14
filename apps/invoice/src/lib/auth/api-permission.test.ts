import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getInvoiceApiContext: vi.fn(),
  resolveAccessContext: vi.fn(),
  canAccess: vi.fn(),
  hasAccessFeature: vi.fn(),
}))

vi.mock('./api-context', () => ({
  getInvoiceApiContext: mocks.getInvoiceApiContext,
}))
vi.mock('./access-context', () => ({
  resolveAccessContext: mocks.resolveAccessContext,
  canAccess: mocks.canAccess,
  hasAccessFeature: mocks.hasAccessFeature,
}))

import { requireApiCapability, requireApiPermission } from './api-permission'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getInvoiceApiContext.mockResolvedValue({
    orgId: 'org_1',
    userId: 'user_1',
  })
  mocks.resolveAccessContext.mockResolvedValue({ status: 'ok', context: {} })
  mocks.canAccess.mockReturnValue(true)
  mocks.hasAccessFeature.mockReturnValue(true)
})

describe('requireApiPermission', () => {
  it('requires every permission when the route declares an aggregate', async () => {
    mocks.canAccess.mockImplementation(
      (_context: unknown, permission: string) => permission !== 'events.view'
    )

    const result = await requireApiPermission([
      'tasks.view',
      'reminders.view',
      'events.view',
    ])

    expect(result.response?.status).toBe(403)
    expect(mocks.canAccess).toHaveBeenCalledWith({}, 'tasks.view')
    expect(mocks.canAccess).toHaveBeenCalledWith({}, 'reminders.view')
    expect(mocks.canAccess).toHaveBeenCalledWith({}, 'events.view')
    expect(mocks.hasAccessFeature).not.toHaveBeenCalled()
  })

  it('accepts an aggregate only when every permission is granted', async () => {
    const result = await requireApiPermission([
      'tasks.view',
      'reminders.view',
      'events.view',
    ])

    expect(result).toEqual({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
    expect(mocks.hasAccessFeature).not.toHaveBeenCalled()
  })
})

describe('requireApiCapability', () => {
  it('requires both permission and the requested feature', async () => {
    mocks.hasAccessFeature.mockReturnValue(false)

    const result = await requireApiCapability({
      permission: 'requests.view',
      feature: 'invoice-requests',
    })

    expect(result.response?.status).toBe(403)
    expect(mocks.canAccess).toHaveBeenCalledWith({}, 'requests.view')
    expect(mocks.hasAccessFeature).toHaveBeenCalledWith({}, 'invoice-requests')
  })

  it('returns the API context when permission and feature both allow access', async () => {
    const result = await requireApiCapability({
      permission: 'requests.view',
      feature: 'invoice-requests',
    })

    expect(result).toEqual({
      response: null,
      orgId: 'org_1',
      userId: 'user_1',
    })
  })
})
