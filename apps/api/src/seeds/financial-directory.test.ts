import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findSeedCountry: vi.fn(),
  upsertSeedBank: vi.fn(),
  upsertSeedBranch: vi.fn(),
}))

vi.mock('./financial-directory.repository', () => repository)

const { seedFinancialDirectory, validateFinancialDirectoryCatalog } = await import(
  './financial-directory'
)

type Catalog = Parameters<typeof validateFinancialDirectoryCatalog>[0]

function catalog(): Catalog {
  return {
    schema_version: 1,
    catalog_revision: '2026-03-19',
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
      },
    ],
  }
}

describe('financial-directory seed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.findSeedCountry.mockResolvedValue({ code: 'JM' })
    repository.upsertSeedBank.mockResolvedValue({
      id: 'bank_ncb',
      created: true,
      deleted: false,
    })
    repository.upsertSeedBranch.mockResolvedValue('created')
  })

  it('validates the Jamaica routing composition', () => {
    expect(() => validateFinancialDirectoryCatalog(catalog())).not.toThrow()
  })

  it('rejects an ABA number that does not match transit, institution and check digit', () => {
    const invalid = catalog()
    invalid.branches[0] = {
      ...invalid.branches[0]!,
      aba: '000300779',
    }

    expect(() => validateFinancialDirectoryCatalog(invalid)).toThrow(
      /does not match transit\/bank\/check digit/
    )
  })

  it('creates a routing branch even when the catalog has no structured geocoded location', async () => {
    const input = catalog()
    const summary = await seedFinancialDirectory(input)

    expect(repository.upsertSeedBank).toHaveBeenCalledWith({
      countryCode: 'JM',
      bankCode: '077',
      name: 'National Commercial Bank Jamaica Limited',
      shortName: 'NCB',
      clearingSystem: 'JACH',
      institutionType: 'commercial_bank',
    })
    expect(repository.upsertSeedBranch).toHaveBeenCalledWith({
      bankId: 'bank_ncb',
      transitNumber: '00030',
      routingNumber: '000300771',
      name: 'Half Way Tree',
    })
    expect(summary).toMatchObject({
      revision: '2026-03-19',
      banksCreated: 1,
      branchesCreated: 1,
      branchesWithoutStructuredLocation: 1,
    })
  })

  it('preserves tombstoned routing branches instead of resurrecting them', async () => {
    repository.upsertSeedBranch.mockResolvedValue('deleted')

    const summary = await seedFinancialDirectory(catalog())

    expect(summary.branchesDeletedPreserved).toBe(1)
    expect(summary.branchesCreated).toBe(0)
  })
})
