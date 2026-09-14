import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = vi.hoisted(() => ({
  creditUnion: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  creditUnionBranch: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}))

const repository = vi.hoisted(() => ({
  findSeedCountry: vi.fn(),
  upsertSeedBank: vi.fn(),
  upsertSeedBranch: vi.fn(),
  upsertSeedCreditUnion: vi.fn(),
  upsertSeedCreditUnionBranch: vi.fn(),
}))

vi.mock('@/db/client', () => ({ prisma }))
vi.mock('@/platform/ids', () => ({ generateId: vi.fn(() => 'generated_id') }))
vi.mock('./financial-directory.repository', () => repository)

const {
  auditFinancialDirectoryCatalog,
  seedFinancialDirectory,
  validateFinancialDirectoryCatalog,
} = await import('./financial-directory')
const seedRepository = await vi.importActual<
  typeof import('./financial-directory.repository')
>('./financial-directory.repository')
const timestamps = await import('@/platform/timestamps')

type Catalog = Parameters<typeof validateFinancialDirectoryCatalog>[0]

function catalog(): Catalog {
  return {
    schema_version: 2,
    catalog_revision: '2026-09-13',
    country_code: 'JM',
    sources: [
      {
        name: 'Automated Payments Limited Branch Code Listing',
        as_of: '2026-03-19',
        url: 'https://example.test/apl-branches.pdf',
      },
    ],
    banks: [
      {
        bank_code: '077',
        name: 'National Commercial Bank Jamaica Limited',
        short_name: 'NCB',
        institution_type: 'commercial_bank',
        clearing_system: 'JACH',
        website: 'https://www.jncb.com/',
        general_phone: '(876) 929-9050-89',
        support_email: 'ncbinfo@jncb.com',
        source_url: 'https://boj.org.jm/commercial-banks/',
        source_as_of: '2026-03-25',
        last_verified_at: '2026-09-13',
      },
    ],
    branches: [
      {
        bank_code: '077',
        transit: '00030',
        check_digit: '1',
        aba: '000300771',
        name: 'Half Way Tree',
        address: 'Half Way Tree, Kingston',
        source_url: 'https://example.test/apl-branches.pdf',
        source_as_of: '2026-03-19',
      },
    ],
    credit_unions: [
      {
        code: 'cwj',
        name: 'Community & Workers of Jamaica Co-operative Credit Union Limited',
        short_name: 'C&WJ',
        website: 'https://www.cwjcu.com/',
        general_phone: '(876) 936-3800',
        source_url: 'https://creditunionsofjamaica.com/cus/',
        last_verified_at: '2026-09-13',
      },
    ],
    credit_union_branches: [
      {
        credit_union_code: 'cwj',
        code: 'cwj-half-way-tree',
        name: 'Half Way Tree',
        contact_number: '(876) 936-3800',
        branch_type: 'head_office',
        status: 'active',
        structured_address: {
          line1: '51 Half Way Tree Road',
          city: 'Kingston',
          state: 'Kingston',
          country: 'JM',
        },
        source_url: 'https://creditunionsofjamaica.com/cus/',
        last_verified_at: '2026-09-13',
      },
    ],
  }
}

describe('financial-directory seed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(timestamps, 'nowUnixSeconds').mockReturnValue(1_700_000_000)
    repository.findSeedCountry.mockResolvedValue({ code: 'JM' })
    repository.upsertSeedBank.mockResolvedValue({
      id: 'bank_ncb',
      created: true,
      deleted: false,
    })
    repository.upsertSeedBranch.mockResolvedValue('created')
    repository.upsertSeedCreditUnion.mockResolvedValue({
      id: 'credit_union_cwj',
      created: true,
      deleted: false,
    })
    repository.upsertSeedCreditUnionBranch.mockResolvedValue('created')
  })

  it('validates the Jamaica routing composition', () => {
    expect(() => validateFinancialDirectoryCatalog(catalog())).not.toThrow()
  })

  it('rejects an ABA number that does not match transit, institution and check digit', () => {
    const invalid = catalog()
    invalid.branches[0] = { ...invalid.branches[0]!, aba: '000300779' }

    expect(() => validateFinancialDirectoryCatalog(invalid)).toThrow(
      /does not match transit\/bank\/check digit/
    )
  })

  it('rejects an unknown institution type', () => {
    const invalid = catalog()
    invalid.banks[0] = { ...invalid.banks[0]!, institution_type: 'hedge_fund' }

    expect(() => validateFinancialDirectoryCatalog(invalid)).toThrow(
      /unknown institution_type/
    )
  })

  it('rejects an unknown branch status', () => {
    const invalid = catalog()
    invalid.credit_union_branches[0] = {
      ...invalid.credit_union_branches[0]!,
      status: 'maybe-open',
    }

    expect(() => validateFinancialDirectoryCatalog(invalid)).toThrow(
      /unknown status/
    )
  })

  it('rejects a credit-union branch that references no known credit union', () => {
    const invalid = catalog()
    invalid.credit_union_branches[0] = {
      ...invalid.credit_union_branches[0]!,
      credit_union_code: 'missing',
    }

    expect(() => validateFinancialDirectoryCatalog(invalid)).toThrow(
      /unknown credit_union_code/
    )
  })

  it('rejects a malformed provenance date', () => {
    const invalid = catalog()
    invalid.banks[0] = { ...invalid.banks[0]!, source_as_of: '25 March 2026' }

    expect(() => validateFinancialDirectoryCatalog(invalid)).toThrow(
      /source_as_of must be YYYY-MM-DD/
    )
  })

  it('seeds banks with their contact and provenance fields', async () => {
    await seedFinancialDirectory(catalog())

    expect(repository.upsertSeedBank).toHaveBeenCalledWith({
      countryCode: 'JM',
      bankCode: '077',
      name: 'National Commercial Bank Jamaica Limited',
      shortName: 'NCB',
      clearingSystem: 'JACH',
      institutionType: 'commercial_bank',
      website: 'https://www.jncb.com/',
      generalPhone: '(876) 929-9050-89',
      supportPhone: null,
      supportEmail: 'ncbinfo@jncb.com',
      complaintsEmail: null,
      contactUrl: null,
      sourceUrl: 'https://boj.org.jm/commercial-banks/',
      sourceAsOf: '2026-03-25',
      lastVerifiedAt: 1789257600n,
    })
  })

  it('creates a routing branch even when the catalog has no structured location', async () => {
    const summary = await seedFinancialDirectory(catalog())

    expect(repository.upsertSeedBranch).toHaveBeenCalledWith({
      bankId: 'bank_ncb',
      transitNumber: '00030',
      routingNumber: '000300771',
      name: 'Half Way Tree',
      rawAddress: 'Half Way Tree, Kingston',
      contactNumber: null,
      operatingHours: null,
      branchType: null,
      status: null,
      sourceUrl: 'https://example.test/apl-branches.pdf',
      sourceAsOf: '2026-03-19',
      lastVerifiedAt: null,
      address: null,
    })
    expect(summary).toMatchObject({
      revision: '2026-09-13',
      banksCreated: 1,
      branchesCreated: 1,
      branchesWithStructuredLocation: 0,
      branchesWithoutStructuredLocation: 1,
    })
  })

  it('seeds a reviewed structured branch address without coordinates', async () => {
    const input = catalog()
    input.branches[0] = {
      ...input.branches[0]!,
      branch_type: 'full_service',
      status: 'active',
      contact_number: '(876) 929-5490',
      operating_hours: 'Mon-Fri 9:00-13:00',
      structured_address: {
        line1: 'Half Way Tree Road',
        city: 'Kingston',
        state: 'St. Andrew',
        postal_code: 'KGN 10',
      },
    }

    const summary = await seedFinancialDirectory(input)

    expect(repository.upsertSeedBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        branchType: 'full_service',
        status: 'active',
        contactNumber: '(876) 929-5490',
        operatingHours: 'Mon-Fri 9:00-13:00',
        address: {
          line1: 'Half Way Tree Road',
          line2: null,
          city: 'Kingston',
          state: 'St. Andrew',
          postalCode: 'KGN 10',
          country: 'JM',
        },
      })
    )
    expect(summary.branchesWithStructuredLocation).toBe(1)
    expect(summary.branchesWithoutStructuredLocation).toBe(0)
  })

  it('preserves tombstoned routing branches instead of resurrecting them', async () => {
    repository.upsertSeedBranch.mockResolvedValue('deleted')

    const summary = await seedFinancialDirectory(catalog())

    expect(summary.branchesDeletedPreserved).toBe(1)
    expect(summary.branchesCreated).toBe(0)
  })

  it('seeds credit unions and their branches through the stable slug keys', async () => {
    const summary = await seedFinancialDirectory(catalog())

    expect(repository.upsertSeedCreditUnion).toHaveBeenCalledWith({
      code: 'cwj',
      name: 'Community & Workers of Jamaica Co-operative Credit Union Limited',
      shortName: 'C&WJ',
      headquarters: null,
      website: 'https://www.cwjcu.com/',
      generalPhone: '(876) 936-3800',
      supportPhone: null,
      supportEmail: null,
      complaintsEmail: null,
      contactUrl: null,
      sourceUrl: 'https://creditunionsofjamaica.com/cus/',
      sourceAsOf: null,
      lastVerifiedAt: 1789257600n,
    })
    expect(repository.upsertSeedCreditUnionBranch).toHaveBeenCalledWith({
      creditUnionId: 'credit_union_cwj',
      code: 'cwj-half-way-tree',
      name: 'Half Way Tree',
      rawAddress: null,
      contactNumber: '(876) 936-3800',
      email: null,
      operatingHours: null,
      branchType: 'head_office',
      status: 'active',
      sourceUrl: 'https://creditunionsofjamaica.com/cus/',
      sourceAsOf: null,
      lastVerifiedAt: 1789257600n,
      address: {
        line1: '51 Half Way Tree Road',
        line2: null,
        city: 'Kingston',
        state: 'Kingston',
        postalCode: null,
        country: 'JM',
      },
    })
    expect(summary).toMatchObject({
      creditUnionsCreated: 1,
      creditUnionBranchesCreated: 1,
    })
  })

  it('preserves a tombstoned credit union instead of resurrecting it', async () => {
    repository.upsertSeedCreditUnion.mockResolvedValue({
      id: 'credit_union_cwj',
      created: false,
      deleted: true,
    })

    const summary = await seedFinancialDirectory(catalog())

    expect(summary.creditUnionsDeletedPreserved).toBe(1)
    expect(summary.creditUnionsCreated).toBe(0)
  })
})

describe('financial-directory audit', () => {
  it('reports the enrichment gaps in a reviewed snapshot', () => {
    const audit = auditFinancialDirectoryCatalog(catalog())

    expect(audit).toMatchObject({
      revision: '2026-09-13',
      countryCode: 'JM',
      banks: {
        total: 1,
        missingWebsite: [],
        missingContact: [],
        missingProvenance: [],
      },
      branches: {
        total: 1,
        missingStructuredLocation: ['077:00030'],
        missingContact: ['077:00030'],
        missingOperatingHours: ['077:00030'],
        missingProvenance: [],
      },
      creditUnions: {
        total: 1,
        missingContact: [],
        missingProvenance: [],
        withoutBranches: [],
      },
      creditUnionBranches: { total: 1, missingProvenance: [] },
    })
  })

  it('names the institutions that still need contact data or branches', () => {
    const input = catalog()
    input.banks[0] = {
      ...input.banks[0]!,
      general_phone: null,
      support_email: null,
      source_url: null,
    }
    input.credit_unions[0] = {
      ...input.credit_unions[0]!,
      general_phone: null,
      website: null,
      source_url: null,
    }
    input.credit_union_branches = []

    const audit = auditFinancialDirectoryCatalog(input)

    expect(audit.banks.missingContact).toEqual(['077'])
    expect(audit.banks.missingProvenance).toEqual(['077'])
    expect(audit.creditUnions.missingContact).toEqual(['cwj'])
    expect(audit.creditUnions.missingProvenance).toEqual(['cwj'])
    expect(audit.creditUnions.withoutBranches).toEqual(['cwj'])
  })
})

function creditUnionSeedData(overrides = {}) {
  return {
    code: 'cwj',
    name: 'Community & Workers',
    shortName: null,
    headquarters: null,
    website: null,
    generalPhone: null,
    supportPhone: null,
    supportEmail: null,
    complaintsEmail: null,
    contactUrl: null,
    sourceUrl: null,
    sourceAsOf: null,
    lastVerifiedAt: null,
    ...overrides,
  }
}

function creditUnionBranchSeedData(overrides = {}) {
  return {
    creditUnionId: 'credit_union_cwj',
    code: 'cwj-half-way-tree',
    name: 'Half Way Tree',
    rawAddress: null,
    contactNumber: null,
    email: null,
    operatingHours: null,
    branchType: null,
    status: null,
    sourceUrl: null,
    sourceAsOf: null,
    lastVerifiedAt: null,
    address: null,
    ...overrides,
  }
}

describe('financial-directory repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adopts a codeless credit union by case-insensitive name', async () => {
    prisma.creditUnion.findUnique.mockResolvedValue(null)
    prisma.creditUnion.findMany.mockResolvedValue([
      { id: 'credit_union_existing', deletedAt: null },
    ])
    prisma.creditUnion.update.mockResolvedValue({
      id: 'credit_union_existing',
      deletedAt: null,
    })

    await seedRepository.upsertSeedCreditUnion(creditUnionSeedData())

    expect(prisma.creditUnion.findMany).toHaveBeenCalledWith({
      where: {
        code: null,
        name: { equals: 'Community & Workers', mode: 'insensitive' },
      },
      select: { id: true, deletedAt: true },
    })
    expect(prisma.creditUnion.update).toHaveBeenCalledWith({
      where: { id: 'credit_union_existing' },
      data: {
        code: 'cwj',
        name: 'Community & Workers',
        updatedAt: 1_700_000_000n,
      },
      select: { id: true, deletedAt: true },
    })
  })

  it('adopts a codeless credit-union branch within its credit union', async () => {
    prisma.creditUnionBranch.findUnique.mockResolvedValue(null)
    prisma.creditUnionBranch.findMany.mockResolvedValue([
      { id: 'credit_union_branch_existing', deletedAt: null, addressId: null },
    ])

    await seedRepository.upsertSeedCreditUnionBranch(
      creditUnionBranchSeedData()
    )

    expect(prisma.creditUnionBranch.findMany).toHaveBeenCalledWith({
      where: {
        creditUnionId: 'credit_union_cwj',
        code: null,
        name: { equals: 'Half Way Tree', mode: 'insensitive' },
      },
      select: { id: true, deletedAt: true, addressId: true },
    })
    expect(prisma.creditUnionBranch.update).toHaveBeenCalledWith({
      where: { id: 'credit_union_branch_existing' },
      data: {
        code: 'cwj-half-way-tree',
        name: 'Half Way Tree',
        updatedAt: 1_700_000_000n,
      },
    })
  })

  it('rejects ambiguous codeless credit-union matches without creating', async () => {
    prisma.creditUnion.findUnique.mockResolvedValue(null)
    prisma.creditUnion.findMany.mockResolvedValue([
      { id: 'credit_union_one', deletedAt: null },
      { id: 'credit_union_two', deletedAt: null },
    ])

    await expect(
      seedRepository.upsertSeedCreditUnion(creditUnionSeedData())
    ).rejects.toThrow(
      'credit union code cwj matches multiple codeless credit unions'
    )

    expect(prisma.creditUnion.create).not.toHaveBeenCalled()
    expect(prisma.creditUnion.update).not.toHaveBeenCalled()
  })

  it('reports an adopted tombstoned credit union as deleted', async () => {
    prisma.creditUnion.findUnique.mockResolvedValue(null)
    prisma.creditUnion.findMany.mockResolvedValue([
      { id: 'credit_union_deleted', deletedAt: 1n },
    ])
    prisma.creditUnion.update.mockResolvedValue({
      id: 'credit_union_deleted',
      deletedAt: 1n,
    })

    await expect(
      seedRepository.upsertSeedCreditUnion(creditUnionSeedData())
    ).resolves.toEqual({
      id: 'credit_union_deleted',
      deleted: true,
      created: false,
    })
  })

  it('does not send null catalog enrichment fields on a credit-union update', async () => {
    prisma.creditUnion.findUnique.mockResolvedValue({
      id: 'credit_union_existing',
      deletedAt: null,
    })
    prisma.creditUnion.update.mockResolvedValue({
      id: 'credit_union_existing',
      deletedAt: null,
    })

    await seedRepository.upsertSeedCreditUnion(creditUnionSeedData())

    expect(prisma.creditUnion.update).toHaveBeenCalledWith({
      where: { id: 'credit_union_existing' },
      data: {
        code: 'cwj',
        name: 'Community & Workers',
        updatedAt: 1_700_000_000n,
      },
      select: { id: true, deletedAt: true },
    })
  })

  it('sends non-null catalog enrichment fields on a credit-union update', async () => {
    prisma.creditUnion.findUnique.mockResolvedValue({
      id: 'credit_union_existing',
      deletedAt: null,
    })
    prisma.creditUnion.update.mockResolvedValue({
      id: 'credit_union_existing',
      deletedAt: null,
    })

    await seedRepository.upsertSeedCreditUnion(
      creditUnionSeedData({ website: 'https://cwj.example.test' })
    )

    expect(prisma.creditUnion.update).toHaveBeenCalledWith({
      where: { id: 'credit_union_existing' },
      data: {
        code: 'cwj',
        name: 'Community & Workers',
        website: 'https://cwj.example.test',
        updatedAt: 1_700_000_000n,
      },
      select: { id: true, deletedAt: true },
    })
  })
})
