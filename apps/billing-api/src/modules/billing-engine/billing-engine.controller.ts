import type { Request, Response } from 'express'

import { validBody } from '@/http/middleware/validate'
import type { BillingSweepParams } from '@/modules/subscriptions'

import { billingEngineService as service } from './billing-engine.service'

export const billingEngineController = {
  async run(req: Request, res: Response) {
    res.json(await service.runSweep(validBody<BillingSweepParams>(req)))
  },
  async runCron(_req: Request, res: Response) {
    // Vercel Hobby runs this once a day, so one invocation must drain the
    // whole day's due work; the time budget, not the row limit, is the bound.
    res.json(await service.runSweep({ limit: 5_000, timeBudgetMs: 240_000 }))
  },
}
