import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getContextMock } = vi.hoisted(() => ({
  getContextMock: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getContext: getContextMock,
  hasPermission: (context: { permissions: string[] }, permission: string) =>
    context.permissions.includes(permission),
}))

import { requirePermission, serializeValue } from './billing-route'

function context(permissions: string[], accessStatus = 'ACTIVE') {
  return {
    tenant: { id: 'blten_1' },
    accessStatus: 'active',
    access: { status: accessStatus, role: { slug: 'viewer' } },
    permissions,
  }
}

describe('requirePermission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('denies a missing permission by default', async () => {
    getContextMock.mockResolvedValue(context(['billing:access', 'taxes:read']))

    const result = await requirePermission('taxes:write')

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(403)
  })

  it('denies a suspended local grant', async () => {
    getContextMock.mockResolvedValue(
      context(['billing:access', 'taxes:write'], 'SUSPENDED')
    )

    const result = await requirePermission('taxes:write')

    expect(result.context).toBeNull()
    expect(result.response?.status).toBe(403)
  })

  it('returns the scoped context when permission is present', async () => {
    const allowed = context(['billing:access', 'taxes:read'])
    getContextMock.mockResolvedValue(allowed)

    const result = await requirePermission('taxes:read')

    expect(result.response).toBeNull()
    expect(result.context).toBe(allowed)
  })
})

describe('serializeValue', () => {
  it('never exposes stored idempotency keys or payload hashes', () => {
    expect(
      serializeValue({
        id: 'cus_1',
        sourceAppId: 'rap_couriers',
        sourceIdempotencyKey: 'customer-create-1',
        sourcePayloadHash: 'payload-hash',
        nested: {
          sourceIdempotencyKey: 'nested-key',
          amount: 100n,
        },
      })
    ).toEqual({
      id: 'cus_1',
      sourceAppId: 'rap_couriers',
      nested: { amount: '100' },
    })
  })
})
