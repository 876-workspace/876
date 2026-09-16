import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: { resolveTenant: vi.fn() },
  repository: {
    listClients: vi.fn(),
    retrieveClient: vi.fn(),
    createClient: vi.fn(),
    revokeClient: vi.fn(),
  },
}))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../integration.repository.js', () => repository)

const service = await import('../integration.service.js')
const guard = await import('../integration.guard.js')

const tenant = { id: 'prjten_1', organizationId: 'org_1' }

function row(overrides = {}) {
  return {
    id: 'intc_1',
    tenantId: tenant.id,
    organizationId: 'org_1',
    name: 'CI sync',
    scopes: ['projects:read'],
    secretHash: 'hash',
    keyPrefix: 'abcd1234',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
})

describe('createClient', () => {
  it('returns tenant-not-found for unknown organizations', async () => {
    tenants.resolveTenant.mockResolvedValueOnce(null)
    const result = await service.createClient({
      organizationId: 'org_missing',
      name: 'Sync',
      scopes: ['projects:read'],
    })
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('returns the plaintext secret once and stores only its hash', async () => {
    repository.createClient.mockImplementationOnce(async (data: {
      secretHash: string
      keyPrefix: string
    }) => row({ secretHash: data.secretHash, keyPrefix: data.keyPrefix }))
    const result = await service.createClient({
      organizationId: 'org_1',
      name: 'Sync',
      scopes: ['projects:read'],
    })
    expect(result.error).toBeNull()
    const created = result.data as { client: { id: string }; secret: string }
    expect(created.secret).toMatch(/^[0-9a-f]{64}$/)
    const stored = repository.createClient.mock.calls[0]?.[0] as {
      secretHash: string
    }
    expect(stored.secretHash).not.toContain(created.secret)
    expect(
      guard.integrationSecretMatches(created.secret, stored.secretHash)
    ).toBe(true)
    expect(JSON.stringify(created.client)).not.toContain(created.secret)
    expect(created.client.id.startsWith('intc_')).toBe(true)
  })
})

describe('listClients', () => {
  it('returns tenant-not-found for unknown organizations', async () => {
    tenants.resolveTenant.mockResolvedValueOnce(null)
    const result = await service.listClients('org_missing')
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('serializes clients without secret material', async () => {
    repository.listClients.mockResolvedValueOnce([row()])
    const result = await service.listClients('org_1')
    expect(result.data?.[0]).toMatchObject({
      object: 'projects.integration-client',
      id: 'intc_1',
    })
    expect(JSON.stringify(result.data)).not.toContain('hash')
  })
})

describe('revokeClient', () => {
  it('returns not-found for other tenants', async () => {
    repository.retrieveClient.mockResolvedValueOnce(
      row({ tenantId: 'prjten_other' })
    )
    const result = await service.revokeClient('org_1', 'intc_1')
    expect(result.error?.code).toBe('projects/integration-client-not-found')
  })

  it('returns not-found for unknown clients', async () => {
    repository.retrieveClient.mockResolvedValueOnce(null)
    const result = await service.revokeClient('org_1', 'intc_missing')
    expect(result.error?.code).toBe('projects/integration-client-not-found')
  })

  it('revokes and stays revoked idempotently', async () => {
    repository.retrieveClient.mockResolvedValueOnce(row())
    repository.revokeClient.mockResolvedValueOnce(row({ revokedAt: 2000n }))
    const result = await service.revokeClient('org_1', 'intc_1')
    expect(result.data?.revokedAt).toBe(2000)
  })

  it('returns already-revoked clients without rewriting', async () => {
    repository.retrieveClient.mockResolvedValueOnce(row({ revokedAt: 2000n }))
    const result = await service.revokeClient('org_1', 'intc_1')
    expect(result.error).toBeNull()
    expect(repository.revokeClient).not.toHaveBeenCalled()
  })
})
