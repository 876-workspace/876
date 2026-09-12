import type { Request, Response } from 'express'

import { validParams, validQuery } from '@/http/middleware/validate'

import {
  listDirectoryBanks,
  listDirectoryBranches,
} from './banking-directory.service'

export const bankingDirectoryController = {
  async listBanks(req: Request, res: Response) {
    const { countryCode } = validQuery<{ countryCode: string }>(req)
    res.json(await listDirectoryBanks(countryCode))
  },

  async listBranches(req: Request, res: Response) {
    const { bankId } = validParams<{ bankId: string }>(req)
    res.json(await listDirectoryBranches(bankId))
  },
}
