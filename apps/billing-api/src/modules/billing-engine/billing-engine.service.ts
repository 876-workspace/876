import { getSettings } from '@/config'
import { errors } from '@/http/errors'
import type { BillingSweepParams } from '@/modules/subscriptions'

import { runBillingSweep } from './billing-engine.repository'

export const billingEngineService = {
  async runSweep(params: BillingSweepParams & { timeBudgetMs?: number }) {
    const writer = getSettings().billingWriter
    if (writer !== 'express') throw errors.writerInactive(writer)

    return runBillingSweep(params)
  },
}
