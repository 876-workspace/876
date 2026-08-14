import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Drift-sync coverage for the org update paths (ADR-009 / handoff #3): a change to
// a Billing-snapshot field (name, doing_business_as, primary_email, primary_phone,
// primary_contact_user_id) must re-emit customer.ensure so the Billing customer
// follows a rename/contact change; a change to a non-snapshot field (slug) must not.

const NOW = 1_785_000_000

const {
  findOrganizationById,
  findOrganizationBySlug,
  updateOrganizationRow,
  enqueueCustomerEnsureForOrganization,
  billingCustomerSyncRepository,
} = vi.hoisted(() => ({
  findOrganizationById: vi.fn(),
  findOrganizationBySlug: vi.fn(),
  updateOrganizationRow: vi.fn(),
  enqueueCustomerEnsureForOrganization: vi.fn(),
  billingCustomerSyncRepository: { enqueue: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('../organizations.repository', () => ({
  findOrganizationById,
  findOrganizationBySlug,
  updateOrganization: updateOrganizationRow,
}))

vi.mock('@/services/billing-customer-sync', () => ({
  enqueueCustomerArchiveForOrganization: vi.fn(),
  enqueueCustomerEnsureForOrganization,
}))

vi.mock('@/services/billing-customer-sync.repository', () => ({
  createBillingCustomerSyncRepository: vi.fn(
    () => billingCustomerSyncRepository
  ),
}))

const { updateOrganization } = await import('../organizations.service')

function organizationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org_4qR8',
    workosOrganizationId: 'org_workos_1',
    name: 'Reyes Logistics',
    shortName: null,
    doingBusinessAs: 'Reyes Freight',
    slug: 'reyes-logistics',
    status: 'active',
    logoUrl: null,
    logoFileId: null,
    industry: 'transportation',
    businessType: 'limited_company',
    registrationNumber: null,
    trn: null,
    nisNumber: null,
    gctNumber: null,
    taxId: null,
    incorporationDate: null,
    primaryPhone: '+1-876-555-0199',
    primaryEmail: 'accounts@reyes.example',
    fax: null,
    websiteUrl: 'https://reyes.example',
    supportUrl: null,
    primaryContactUserId: 'user_2kL9',
    timezone: 'America/Jamaica',
    language: 'en',
    addressLine1: '12 Harbour Street',
    addressLine2: null,
    city: 'Kingston',
    regionId: null,
    countryCode: 'JM',
    currencyCode: 'JMD',
    enrollmentCompletedAt: null,
    metadata: { segment: 'logistics' },
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: BigInt(NOW - 1_000),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))

  findOrganizationById.mockResolvedValue(organizationRow())
  findOrganizationBySlug.mockResolvedValue(null)
  enqueueCustomerEnsureForOrganization.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('updateOrganization Billing drift-sync', () => {
  it('re-emits customer.ensure with the updated snapshot when the name changes', async () => {
    updateOrganizationRow.mockResolvedValue(
      organizationRow({ name: 'Reyes Freight Co' })
    )

    await updateOrganization('org_4qR8', { name: 'Reyes Freight Co' })

    expect(enqueueCustomerEnsureForOrganization).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerEnsureForOrganization).toHaveBeenCalledWith(
      { repository: billingCustomerSyncRepository },
      {
        id: 'org_4qR8',
        name: 'Reyes Freight Co',
        slug: 'reyes-logistics',
        doingBusinessAs: 'Reyes Freight',
        primaryEmail: 'accounts@reyes.example',
        primaryPhone: '+1-876-555-0199',
        primaryContactUserId: 'user_2kL9',
      },
      NOW
    )
  })

  it('re-emits customer.ensure when the primary contact changes', async () => {
    updateOrganizationRow.mockResolvedValue(
      organizationRow({ primaryContactUserId: 'user_9xZ2' })
    )

    await updateOrganization('org_4qR8', {
      primary_contact_user_id: 'user_9xZ2',
    })

    expect(enqueueCustomerEnsureForOrganization).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerEnsureForOrganization).toHaveBeenCalledWith(
      { repository: billingCustomerSyncRepository },
      expect.objectContaining({
        id: 'org_4qR8',
        primaryContactUserId: 'user_9xZ2',
      }),
      NOW
    )
  })

  it('does not emit customer.ensure when only the slug changes', async () => {
    updateOrganizationRow.mockResolvedValue(
      organizationRow({ slug: 'reyes-freight' })
    )

    await updateOrganization('org_4qR8', { slug: 'reyes-freight' })

    expect(updateOrganizationRow).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerEnsureForOrganization).not.toHaveBeenCalled()
  })
})
