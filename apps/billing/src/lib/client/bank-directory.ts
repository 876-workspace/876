import { request } from './request'

export interface BankDirectoryBank {
  object: 'bank-directory-bank'
  id: string
  countryCode: string
  name: string
  shortName: string | null
  bankCode: string
  clearingSystem: string | null
  institutionType: string
}

export interface BankDirectoryBranch {
  object: 'bank-directory-branch'
  id: string
  bankId: string
  name: string
  transitNumber: string
  routingNumber: string | null
}

type List<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  total_count: number
  url: string
}

export const bankDirectory = {
  listBanks(countryCode = 'JM') {
    const query = new URLSearchParams({ countryCode })
    return request<List<BankDirectoryBank>>(
      `/api/v1/banking/directory/banks?${query.toString()}`
    )
  },

  listBranches(bankId: string) {
    return request<List<BankDirectoryBranch>>(
      `/api/v1/banking/directory/banks/${encodeURIComponent(bankId)}/branches`
    )
  },
}
