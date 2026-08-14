import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1_785_000_000
const CLOSED_AT = BigInt(NOW - 60)

const {
  findOrganizationById,
  restoreMembershipsForOrg,
  restoreOrganizationRow,
  enqueueCustomerEnsureForOrganization,
  billingCustomerSyncRepository,
} = vi.hoisted(() => ({
  findOrganizationById: vi.fn(),
  restoreMembershipsForOrg: vi.fn(),
  restoreOrganizationRow: vi.fn(),
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
  restoreMembershipsForOrg,
  restoreOrganization: restoreOrganizationRow,
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

const { restoreOrganization } = await import('../organizations.service')

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
    deletedAt: CLOSED_AT,
    deletedBy: 'user_admin',
    deletionReason: 'duplicate',
    createdAt: BigInt(NOW - 1_000),
    updatedAt: BigInt(NOW - 60),
    ...overrides,
  }
}

function serializedOrganization(overrides: Record<string, unknown> = {}) {
  return {
    object: 'organization',
    id: 'org_4qR8',
    workos_organization_id: 'org_workos_1',
    name: 'Reyes Logistics',
    short_name: null,
    doing_business_as: 'Reyes Freight',
    slug: 'reyes-logistics',
    status: 'active',
    logo_url: null,
    logo_file_id: null,
    industry: 'transportation',
    business_type: 'limited_company',
    registration_number: null,
    trn: null,
    nis_number: null,
    gct_number: null,
    tax_id: null,
    incorporation_date: null,
    primary_phone: '+1-876-555-0199',
    primary_email: 'accounts@reyes.example',
    fax: null,
    website_url: 'https://reyes.example',
    support_url: null,
    primary_contact_user_id: 'user_2kL9',
    timezone: 'America/Jamaica',
    language: 'en',
    address_line1: '12 Harbour Street',
    address_line2: null,
    city: 'Kingston',
    region_id: null,
    country_code: 'JM',
    currency_code: 'JMD',
    enrollment_completed_at: null,
    metadata: { segment: 'logistics' },
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: NOW - 1_000,
    updated_at: NOW,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))

  findOrganizationById.mockResolvedValue(organizationRow())
  restoreMembershipsForOrg.mockResolvedValue(2)
  restoreOrganizationRow.mockResolvedValue(
    organizationRow({
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      updatedAt: BigInt(NOW),
    })
  )
  enqueueCustomerEnsureForOrganization.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('restoreOrganization', () => {
  it('restores the tombstone and matching memberships and ensures an active Billing customer', async () => {
    const result = await restoreOrganization('org_4qR8')

    expect(result).toEqual(serializedOrganization())
    expect(findOrganizationById).toHaveBeenCalledTimes(1)
    expect(findOrganizationById).toHaveBeenCalledWith('org_4qR8', true)
    expect(restoreMembershipsForOrg).toHaveBeenCalledTimes(1)
    expect(restoreMembershipsForOrg).toHaveBeenCalledWith('org_4qR8', CLOSED_AT)
    expect(restoreOrganizationRow).toHaveBeenCalledTimes(1)
    expect(restoreOrganizationRow).toHaveBeenCalledWith('org_4qR8')
    expect(enqueueCustomerEnsureForOrganization).toHaveBeenCalledTimes(1)
    expect(enqueueCustomerEnsureForOrganization).toHaveBeenCalledWith(
      { repository: billingCustomerSyncRepository },
      {
        id: 'org_4qR8',
        name: 'Reyes Logistics',
        slug: 'reyes-logistics',
        doingBusinessAs: 'Reyes Freight',
        primaryEmail: 'accounts@reyes.example',
        primaryPhone: '+1-876-555-0199',
        primaryContactUserId: 'user_2kL9',
      },
      NOW
    )
  })

  it('returns a live organization without restore or Billing side effects', async () => {
    findOrganizationById.mockResolvedValue(
      organizationRow({
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        updatedAt: BigInt(NOW),
      })
    )

    const result = await restoreOrganization('org_4qR8')

    expect(result).toEqual(serializedOrganization())
    expect(findOrganizationById).toHaveBeenCalledTimes(1)
    expect(findOrganizationById).toHaveBeenCalledWith('org_4qR8', true)
    expect(restoreMembershipsForOrg).not.toHaveBeenCalled()
    expect(restoreOrganizationRow).not.toHaveBeenCalled()
    expect(enqueueCustomerEnsureForOrganization).not.toHaveBeenCalled()
  })

  it('throws organization/not-found without restore side effects for a missing organization', async () => {
    findOrganizationById.mockResolvedValue(null)

    await expect(restoreOrganization('org_missing')).rejects.toMatchObject({
      code: 'organization/not-found',
      message: 'No organization exists with the provided identifier.',
      httpStatus: 404,
    })
    expect(findOrganizationById).toHaveBeenCalledTimes(1)
    expect(findOrganizationById).toHaveBeenCalledWith('org_missing', true)
    expect(restoreMembershipsForOrg).not.toHaveBeenCalled()
    expect(restoreOrganizationRow).not.toHaveBeenCalled()
    expect(enqueueCustomerEnsureForOrganization).not.toHaveBeenCalled()
  })
})
