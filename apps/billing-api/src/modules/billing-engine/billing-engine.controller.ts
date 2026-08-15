import type { Request, Response } from 'express'

import { validBody } from '@/http/middleware/validate'
import type { BillingSweepParams } from '@/modules/subscriptions'

import { billingEngineService as service } from './billing-engine.service'

export const billingEngineController = {
  async run(req: Request, res: Response) {
    res.json(await service.runSweep(validBody<BillingSweepParams>(req)))
  },
}
