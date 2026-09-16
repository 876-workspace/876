import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  revokeClient: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: { revokeClient: mocks.revokeClient },
}))

const { POST } = await import('./route')

function context(clientId: string) {
  return { params: Promise.resolve({ clientId }) }
}

const revoked = {
  object: 'projects.integration-client',
  id: 'intc_1',
  name: 'CI sync',
  revokedAt: 1700000001,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.revokeClient.mockResolvedValue({ data: revoked, error: null })
})

describe('POST /api/integration-clients/[clientId]/revoke', () => {
  it('requires the projects edit permission', async () => {
    await POST(new NextRequest('http://localhost/x', { method: 'POST' }), context('intc_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('revokes the decoded client for the organization', async () => {
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('intc%201')
    )
    expect(mocks.revokeClient).toHaveBeenCalledWith('intc 1', 'org_1')
    expect(response.status).toBe(200)
  })

  it('never returns a secret from revoke', async () => {
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('intc_1')
    )
    expect(await response.text()).not.toMatch(/"secret"\s*:/)
  })

  it('returns 404 for an unknown client', async () => {
    mocks.revokeClient.mockResolvedValue({
      data: null,
      error: { code: 'projects/integration-client-not-found', message: 'Missing.' },
    })
    const response = await POST(
      new NextRequest('http://localhost/x', { method: 'POST' }),
      context('intc_1')
    )
    expect(response.status).toBe(404)
  })
})
