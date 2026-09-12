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
  logoUrl: string | null
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
  listBanks(countryCode = 'JM', ids?: string[]) {
    const query = new URLSearchParams({ countryCode })
    if (ids?.length) query.set('ids', ids.join(','))
    return request<List<BankDirectoryBank>>(
      `/api/banking/directory/banks?${query.toString()}`
    )
  },

  listBranches(bankId: string, ids?: string[]) {
    const query = ids?.length
      ? `?ids=${encodeURIComponent(ids.join(','))}`
      : ''
    return request<List<BankDirectoryBranch>>(
      `/api/banking/directory/banks/${encodeURIComponent(bankId)}/branches${query}`
    )
  },

  listBranchesByIds(ids: string[]) {
    const query = new URLSearchParams({ ids: ids.join(',') })
    return request<List<BankDirectoryBranch>>(
      `/api/banking/directory/branches?${query.toString()}`
    )
  },
}
