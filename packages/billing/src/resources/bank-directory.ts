import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  BankDirectoryBankListSchema,
  BankDirectoryBranchListSchema,
} from '../types/bank-directory.schema'
import type {
  BankDirectoryBankList,
  BankDirectoryBranchList,
} from '../types/bank-directory'
import type { RequestOptions } from '../types'

export function createBankDirectoryResource(runtime: Runtime) {
  return {
    listBanks(countryCode = 'JM', options?: RequestOptions) {
      return Request<BankDirectoryBankList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/directory/banks',
          query: { countryCode },
          signal: options?.signal,
        },
        BankDirectoryBankListSchema
      )
    },

    listBranches(bankId: string, options?: RequestOptions) {
      return Request<BankDirectoryBranchList>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/banking/directory/banks/${encodeURIComponent(bankId)}/branches`,
          signal: options?.signal,
        },
        BankDirectoryBranchListSchema
      )
    },
  }
}
