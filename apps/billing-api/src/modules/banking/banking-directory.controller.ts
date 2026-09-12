import type { Request, Response } from 'express'

import { validParams, validQuery } from '@/http/middleware/validate'

import {
  listDirectoryBanks,
  listDirectoryBranches,
  listDirectoryBranchesByIds,
} from './banking-directory.service'

export const bankingDirectoryController = {
  async listBanks(req: Request, res: Response) {
    const { countryCode, ids } = validQuery<{
      countryCode: string
      ids?: string[]
    }>(req)
    res.json(await listDirectoryBanks(countryCode, ids))
  },

  async listBranches(req: Request, res: Response) {
    const { bankId } = validParams<{ bankId: string }>(req)
    const { ids } = validQuery<{ ids?: string[] }>(req)
    res.json(await listDirectoryBranches(bankId, ids))
  },

  async listBranchesByIds(req: Request, res: Response) {
    const { ids } = validQuery<{ ids?: string[] }>(req)
    res.json(await listDirectoryBranchesByIds(ids ?? []))
  },
}
