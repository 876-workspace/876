import type { List } from './common'

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

export type BankDirectoryBankList = List<BankDirectoryBank>
export type BankDirectoryBranchList = List<BankDirectoryBranch>
