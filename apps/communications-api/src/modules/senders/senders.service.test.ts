// Set before any module-scope config read: importing the service pulls in the
// domains repository, which resolves the database settings at import time.
process.env.COMMUNICATIONS_DATABASE_URL =
  'postgresql://localhost:5432/communications_test'

import { resetSettingsForTest } from '../../config/index.js'
import { managedDisambiguator } from './senders.managed.js'
import * as repository from './senders.repository.js'
import { ensureManagedSender } from './senders.service.js'

vi.mock('../../db/index.js', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
}))

vi.mock('./senders.repository.js', () => ({
  list: vi.fn(),
  retrieve: vi.fn(),
  retrieveByEmail: vi.fn(),
  retrieveManaged: vi.fn(),
  findOwnerOfEmail: vi.fn(),
  countActive: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}))

const now = BigInt(1_700_000_000)

function senderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sender_1',
    organizationId: 'org_1',
    domainId: null,
    name: 'Acme Freight',
    email: 'acme-freight@mail.87six.dev',
    replyTo: 'billing@acme.com',
    kind: 'managed',
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    ...overrides,
  }
}

const input = {
  organizationName: 'Acme Freight',
  organizationSlug: 'acme-freight',
  replyTo: 'billing@acme.com',
}

describe('ensureManagedSender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.COMMUNICATIONS_DATABASE_URL =
      'postgresql://localhost:5432/communications_test'
    process.env.PLATFORM_SENDING_DOMAIN = 'mail.87six.dev'
    resetSettingsForTest()

    vi.mocked(repository.retrieveManaged).mockResolvedValue(null)
    vi.mocked(repository.findOwnerOfEmail).mockResolvedValue(null)
    vi.mocked(repository.countActive).mockResolvedValue(0)
    vi.mocked(repository.create).mockResolvedValue(senderRow())
  })

  afterEach(() => {
    delete process.env.PLATFORM_SENDING_DOMAIN
    resetSettingsForTest()
  })

  it('provisions the sender at the slug-derived address on the platform domain', async () => {
    const result = await ensureManagedSender('org_1', input)

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      object: 'email_sender',
      kind: 'managed',
      domainId: null,
      email: 'acme-freight@mail.87six.dev',
      replyTo: 'billing@acme.com',
    })
    expect(repository.create).toHaveBeenCalledTimes(1)
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        domainId: null,
        kind: 'managed',
        email: 'acme-freight@mail.87six.dev',
        name: 'Acme Freight',
        replyTo: 'billing@acme.com',
      })
    )
  })

  it('is idempotent — an existing managed sender is returned without a write', async () => {
    vi.mocked(repository.retrieveManaged).mockResolvedValue(
      senderRow({ email: 'original@mail.87six.dev' })
    )

    const result = await ensureManagedSender('org_1', input)

    expect(result.error).toBeNull()
    expect(result.data?.email).toBe('original@mail.87six.dev')
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.findOwnerOfEmail).not.toHaveBeenCalled()
  })

  it('does not rewrite an existing address when the organization is renamed', async () => {
    vi.mocked(repository.retrieveManaged).mockResolvedValue(
      senderRow({ email: 'oldname@mail.87six.dev', name: 'Old Name' })
    )

    const result = await ensureManagedSender('org_1', {
      ...input,
      organizationName: 'Totally New Name',
      organizationSlug: 'totally-new-name',
    })

    expect(result.data?.email).toBe('oldname@mail.87six.dev')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('falls back to the disambiguated address when another organization owns the first', async () => {
    vi.mocked(repository.findOwnerOfEmail).mockImplementation(
      async (email: string) =>
        email === 'acme-freight@mail.87six.dev'
          ? { id: 'sender_other', organizationId: 'org_other' }
          : null
    )
    const expected = `acme-freight-${managedDisambiguator('org_1')}@mail.87six.dev`
    vi.mocked(repository.create).mockResolvedValue(
      senderRow({ email: expected })
    )

    const result = await ensureManagedSender('org_1', input)

    expect(result.error).toBeNull()
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: expected })
    )
  })

  it('never assigns an address already owned by another organization', async () => {
    vi.mocked(repository.findOwnerOfEmail).mockResolvedValue({
      id: 'sender_other',
      organizationId: 'org_other',
    })

    const result = await ensureManagedSender('org_1', input)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('communications/sender-already-exists')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('reuses an address this same organization already owns', async () => {
    vi.mocked(repository.findOwnerOfEmail).mockResolvedValue({
      id: 'sender_existing',
      organizationId: 'org_1',
    })

    const result = await ensureManagedSender('org_1', input)

    expect(result.error).toBeNull()
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'acme-freight@mail.87six.dev' })
    )
  })

  it('never assigns a reserved local part even when the slug asks for one', async () => {
    vi.mocked(repository.create).mockResolvedValue(
      senderRow({
        email: `org-${managedDisambiguator('org_1')}@mail.87six.dev`,
      })
    )

    await ensureManagedSender('org_1', {
      ...input,
      organizationSlug: 'postmaster',
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: `org-${managedDisambiguator('org_1')}@mail.87six.dev`,
      })
    )
    expect(repository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: 'postmaster@mail.87six.dev' })
    )
  })

  it('becomes the default sender when the organization has none', async () => {
    vi.mocked(repository.countActive).mockResolvedValue(0)

    await ensureManagedSender('org_1', input)

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true })
    )
  })

  it('does not steal default from an existing active sender', async () => {
    vi.mocked(repository.countActive).mockResolvedValue(2)

    await ensureManagedSender('org_1', input)

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: false })
    )
  })

  it('stores no reply-to when the organization has no address of its own', async () => {
    vi.mocked(repository.create).mockResolvedValue(senderRow({ replyTo: null }))

    await ensureManagedSender('org_1', {
      organizationName: 'Acme Freight',
      organizationSlug: 'acme-freight',
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: null })
    )
  })

  it('lowercases the stored reply-to address', async () => {
    await ensureManagedSender('org_1', {
      ...input,
      replyTo: 'Billing@Acme.COM',
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'billing@acme.com' })
    )
  })

  it('scopes the address to the configured platform sending domain', async () => {
    process.env.PLATFORM_SENDING_DOMAIN = 'mail.example.test'
    resetSettingsForTest()
    vi.mocked(repository.create).mockResolvedValue(
      senderRow({ email: 'acme-freight@mail.example.test' })
    )

    await ensureManagedSender('org_1', input)

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'acme-freight@mail.example.test' })
    )
  })
})
