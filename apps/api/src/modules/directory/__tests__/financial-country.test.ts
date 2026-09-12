import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  countryExists: vi.fn(),
  findBankByCode: vi.fn(),
  createBank: vi.fn(),
  findBankById: vi.fn(),
  findBankBranchById: vi.fn(),
  createBankAccount: vi.fn(),
  findBankAccountById: vi.fn(),
  updateBankAccount: vi.fn(),
}))

vi.mock('../financial.repository', () => repository)

const service = await import('../financial.service')

const NOW = 1_789_000_000

function bankRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bank_jm_1',
    countryCode: 'JM',
    name: 'Example Bank Jamaica',
    shortName: 'EBJ',
    bankCode: '001',
    clearingSystem: 'JACH',
    institutionType: 'commercial_bank',
    swiftCode: null,
    logoUrl: null,
    headOffice: null,
    website: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

function branchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'branch_1',
    bankId: 'bank_jm_1',
    name: 'Kingston Branch',
    transitNumber: '00001',
    routingNumber: null,
    addressId: 'addr_1',
    contactNumber: null,
    operatingHours: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    directoryAddress: {
      id: 'addr_1',
      line1: '1 King Street',
      line2: null,
      city: 'Kingston',
      state: 'Kingston',
      postalCode: null,
      country: 'JM',
      latitude: 17.97,
      longitude: -76.79,
      createdAt: BigInt(NOW),
      updatedAt: BigInt(NOW),
    },
    ...overrides,
  }
}

describe('country-aware financial directory rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes duplicate bank-code lookup by country', async () => {
    repository.countryExists.mockResolvedValue({ code: 'JM' })
    repository.findBankByCode.mockResolvedValue(null)
    repository.createBank.mockResolvedValue(bankRow())

    const result = await service.createBank({
      country_code: 'JM',
      name: 'Example Bank Jamaica',
      bank_code: '001',
      institution_type: 'commercial_bank',
    })

    expect(result.country_code).toBe('JM')
    expect(repository.findBankByCode).toHaveBeenCalledWith('JM', '001', true)
  })

  it('allows the same local bank code to be checked independently in another country', async () => {
    repository.countryExists.mockResolvedValue({ code: 'TT' })
    repository.findBankByCode.mockResolvedValue(null)
    repository.createBank.mockResolvedValue(
      bankRow({ id: 'bank_tt_1', countryCode: 'TT', name: 'Example Bank Trinidad' })
    )

    const result = await service.createBank({
      country_code: 'TT',
      name: 'Example Bank Trinidad',
      bank_code: '001',
      institution_type: 'commercial_bank',
    })

    expect(result.country_code).toBe('TT')
    expect(repository.findBankByCode).toHaveBeenCalledWith('TT', '001', true)
  })

  it('rejects a duplicate bank code inside the same country', async () => {
    repository.countryExists.mockResolvedValue({ code: 'JM' })
    repository.findBankByCode.mockResolvedValue(bankRow())

    await expect(
      service.createBank({
        country_code: 'JM',
        name: 'Another Jamaican Bank',
        bank_code: '001',
        institution_type: 'commercial_bank',
      })
    ).rejects.toMatchObject({
      code: 'bank/duplicate-code',
      httpStatus: 409,
    })

    expect(repository.createBank).not.toHaveBeenCalled()
  })

  it('rejects creating an account with a branch owned by another bank', async () => {
    repository.findBankById.mockResolvedValue(bankRow({ id: 'bank_2' }))
    repository.findBankBranchById.mockResolvedValue(
      branchRow({ bankId: 'bank_1' })
    )

    await expect(
      service.createBankAccount({
        account_holder: 'Example Limited',
        bank_id: 'bank_2',
        branch_id: 'branch_1',
        account_number: '123456789',
        account_type: 'checking',
        currency: 'JMD',
      })
    ).rejects.toMatchObject({
      code: 'bank_account/invalid-reference',
      httpStatus: 422,
    })

    expect(repository.createBankAccount).not.toHaveBeenCalled()
  })

  it('rejects changing a bank while implicitly retaining a branch from the old bank', async () => {
    repository.findBankAccountById.mockResolvedValue({
      id: 'acct_1',
      bankId: 'bank_old',
      branchId: 'branch_old',
    })
    repository.findBankById.mockResolvedValue(bankRow({ id: 'bank_new' }))
    repository.findBankBranchById.mockResolvedValue(
      branchRow({ id: 'branch_old', bankId: 'bank_old' })
    )

    await expect(
      service.updateBankAccount('acct_1', { bank_id: 'bank_new' })
    ).rejects.toMatchObject({
      code: 'bank_account/invalid-reference',
      httpStatus: 422,
    })

    expect(repository.updateBankAccount).not.toHaveBeenCalled()
  })
})
