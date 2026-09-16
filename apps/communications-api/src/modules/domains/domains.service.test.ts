import type { EmailProvider } from '../../providers/email-provider.js'
import * as repository from './domains.repository.js'
import {
  createDomain,
  deleteDomain,
  listDomains,
  refreshDomain,
  retrieveDomain,
  verifyDomain,
} from './domains.service.js'

vi.mock('./domains.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  retrieveByName: vi.fn(),
  create: vi.fn(),
  updateProviderState: vi.fn(),
  softDelete: vi.fn(),
}))

const now = BigInt(1_700_000_000)

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'edom_1',
    organizationId: 'org_1',
    provider: 'resend',
    providerDomainId: 'domain_1',
    name: 'mail.acme.com',
    region: null,
    status: 'pending',
    records: [],
    verifiedAt: null,
    lastCheckedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    ...overrides,
  }
}

function provider(): EmailProvider {
  return {
    name: 'resend',
    createDomain: vi.fn().mockResolvedValue({
      providerDomainId: 'domain_1',
      name: 'mail.acme.com',
      region: null,
      status: 'pending',
      records: [],
    }),
    retrieveDomain: vi.fn().mockResolvedValue({
      providerDomainId: 'domain_1',
      name: 'mail.acme.com',
      region: null,
      status: 'verified',
      records: [],
    }),
    verifyDomain: vi.fn().mockResolvedValue(undefined),
    deleteDomain: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
  }
}

describe('domain service', () => {
  it('lists domains as public objects', async () => {
    vi.mocked(repository.list).mockResolvedValue([row()] as never)

    const result = await listDomains('org_1')

    expect(result.data?.[0]).toMatchObject({
      object: 'email_domain',
      organizationId: 'org_1',
      name: 'mail.acme.com',
    })
  })

  it('returns not found for a missing domain', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)

    const result = await retrieveDomain('org_1', 'edom_missing')

    expect(result.error?.code).toBe('communications/domain-not-found')
  })

  it('rejects a duplicate organization domain before provider creation', async () => {
    vi.mocked(repository.retrieveByName).mockResolvedValue(row() as never)
    const emailProvider = provider()

    const result = await createDomain(
      'org_1',
      { name: 'mail.acme.com' },
      emailProvider
    )

    expect(result.error?.code).toBe('communications/domain-already-exists')
    expect(emailProvider.createDomain).not.toHaveBeenCalled()
  })

  it('creates the provider domain and persists its verification records', async () => {
    vi.mocked(repository.retrieveByName).mockResolvedValue(null)
    vi.mocked(repository.create).mockResolvedValue(
      row({
        records: [
          {
            name: 'resend._domainkey',
            type: 'TXT',
            value: 'key',
          },
        ],
      }) as never
    )
    const emailProvider = provider()
    vi.mocked(emailProvider.createDomain).mockResolvedValue({
      providerDomainId: 'domain_1',
      name: 'mail.acme.com',
      region: 'us-east-1',
      status: 'pending',
      records: [
        { name: 'resend._domainkey', type: 'TXT', value: 'key' },
      ],
    })

    const result = await createDomain(
      'org_1',
      { name: 'mail.acme.com' },
      emailProvider
    )

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        providerDomainId: 'domain_1',
        status: 'pending',
      })
    )
    expect(result.data?.records).toHaveLength(1)
  })

  it('returns a registered provider error when create fails', async () => {
    vi.mocked(repository.retrieveByName).mockResolvedValue(null)
    const emailProvider = provider()
    vi.mocked(emailProvider.createDomain).mockRejectedValue(new Error('network'))

    const result = await createDomain(
      'org_1',
      { name: 'mail.acme.com' },
      emailProvider
    )

    expect(result.error?.code).toBe('communications/provider-unavailable')
  })

  it('returns not found when verification targets another organization', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)

    const result = await verifyDomain('org_1', 'edom_other', provider())

    expect(result.error?.code).toBe('communications/domain-not-found')
  })

  it('verifies remotely and persists verified state', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.updateProviderState).mockResolvedValue(
      row({ status: 'verified', verifiedAt: now }) as never
    )
    const emailProvider = provider()

    const result = await verifyDomain('org_1', 'edom_1', emailProvider)

    expect(emailProvider.verifyDomain).toHaveBeenCalledWith('domain_1')
    expect(repository.updateProviderState).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'verified' })
    )
    expect(result.data?.status).toBe('verified')
  })

  it('refreshes provider state without forcing verification', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.updateProviderState).mockResolvedValue(
      row({ status: 'pending' }) as never
    )
    const emailProvider = provider()
    vi.mocked(emailProvider.retrieveDomain).mockResolvedValue({
      providerDomainId: 'domain_1',
      name: 'mail.acme.com',
      region: null,
      status: 'pending',
      records: [],
    })

    const result = await refreshDomain('org_1', 'edom_1', emailProvider)

    expect(emailProvider.verifyDomain).not.toHaveBeenCalled()
    expect(result.data?.status).toBe('pending')
  })

  it('deletes the provider domain before tombstoning the local resource', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(row() as never)
    vi.mocked(repository.softDelete).mockResolvedValue(
      row({ deletedAt: now }) as never
    )
    const emailProvider = provider()

    const result = await deleteDomain(
      'org_1',
      'edom_1',
      'usr_1',
      emailProvider
    )

    expect(emailProvider.deleteDomain).toHaveBeenCalledWith('domain_1')
    expect(repository.softDelete).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org_1', deletedBy: 'usr_1' })
    )
    expect(result.data).toMatchObject({ deleted: true })
  })

  it('does not call the provider when deleting a missing domain', async () => {
    vi.mocked(repository.retrieve).mockResolvedValue(null)
    const emailProvider = provider()

    const result = await deleteDomain(
      'org_1',
      'edom_missing',
      'usr_1',
      emailProvider
    )

    expect(emailProvider.deleteDomain).not.toHaveBeenCalled()
    expect(result.error?.code).toBe('communications/domain-not-found')
  })
})
