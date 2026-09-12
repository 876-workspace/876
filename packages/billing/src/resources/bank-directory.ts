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

function idsQuery(ids: string[] | undefined): string | undefined {
  return ids?.length ? ids.join(',') : undefined
}

export function createBankDirectoryResource(runtime: Runtime) {
  return {
    listBanks(countryCode = 'JM', options?: RequestOptions & { ids?: string[] }) {
      return Request<BankDirectoryBankList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/directory/banks',
          query: { countryCode, ids: idsQuery(options?.ids) },
          signal: options?.signal,
        },
        BankDirectoryBankListSchema
      )
    },

    listBranches(
      bankId: string,
      options?: RequestOptions & { ids?: string[] }
    ) {
      return Request<BankDirectoryBranchList>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/banking/directory/banks/${encodeURIComponent(bankId)}/branches`,
          query: { ids: idsQuery(options?.ids) },
          signal: options?.signal,
        },
        BankDirectoryBranchListSchema
      )
    },

    listBranchesByIds(ids: string[], options?: RequestOptions) {
      return Request<BankDirectoryBranchList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/banking/directory/branches',
          query: { ids: ids.join(',') },
          signal: options?.signal,
        },
        BankDirectoryBranchListSchema
      )
    },
  }
}
