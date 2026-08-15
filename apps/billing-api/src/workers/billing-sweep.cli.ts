import { disconnectDb } from '@/db'
import { billingEngineService } from '@/modules/billing-engine'
import { BillingSweepSchema } from '@/modules/subscriptions'
import { getLogger } from '@/platform/logger'

const log = getLogger('billing-sweep')

async function main(): Promise<void> {
  const asOf = process.env.BILLING_SWEEP_AS_OF
    ? Number(process.env.BILLING_SWEEP_AS_OF)
    : undefined
  const limit = process.env.BILLING_SWEEP_LIMIT
    ? Number(process.env.BILLING_SWEEP_LIMIT)
    : 25
  const params = BillingSweepSchema.parse({
    ...(asOf === undefined ? {} : { asOf }),
    limit,
  })
  const result = await billingEngineService.runSweep(params)
  log.info({ result }, 'billing_sweep_completed')
}

main()
  .catch((error: unknown) => {
    log.error({ err: error }, 'billing_sweep_failed')
    process.exitCode = 1
  })
  .finally(disconnectDb)
