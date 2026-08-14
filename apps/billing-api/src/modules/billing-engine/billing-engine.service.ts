import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import type { BillingSweepParams } from '@/modules/subscriptions'

import { runBillingSweep } from './billing-engine.repository'

export const billingEngineService = {
  async runSweep(params: BillingSweepParams) {
    if (getSettings().billingWriter !== 'express')
      throw new AppHttpError({
        code: 'billing/writer-inactive',
        message: 'The Billing API is not the active writer.',
        httpStatus: 503,
      })

    return runBillingSweep(params)
  },
}
