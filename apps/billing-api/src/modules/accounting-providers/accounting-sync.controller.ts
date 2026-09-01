import type { Request, Response } from 'express'
import { validBody } from '@/http/middleware/validate'
import type { AccountingSyncRunBody } from './accounting-providers.schemas'
import { runAccountingSync } from './accounting-sync.service'

export const accountingSyncController = {
  async run(req: Request, res: Response) {
    const body = validBody<AccountingSyncRunBody>(req)
    res.json(await runAccountingSync(body.limit))
  },
}
