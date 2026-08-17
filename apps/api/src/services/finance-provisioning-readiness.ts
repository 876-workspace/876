import { AppHttpError } from '@/http/errors'
import { getLogger } from '@/platform/logger'
import { ensureFinanceProvisioningDelivered } from '@/workers/finance-provisioning-dispatch'
import {
  reconcileFinanceConnections,
  type FinanceProvisioningDeps,
  type ProvisioningRunTrigger,
} from './finance-provisioning'

const log = getLogger('finance_provisioning_readiness')

export type EnsureFinanceWorkspaceReadyParams = {
  organizationId: string
  appId: string
  trigger?: ProvisioningRunTrigger
}

export type FinanceReadinessResult = {
  organizationId: string
  appId: string
  ready: true
  eventIds: string[]
}

/**
 * Guarantees that the finance workspace required by an exact organization and
 * app is fully prepared and confirmed delivered.
 *
 * Reconciles the connection in strict mode, ensures all returned outbox event
 * IDs are delivered immediately via the foreground barrier, and verifies the
 * final readiness post-condition.
 */
export async function ensureFinanceWorkspaceReady(
  deps: FinanceProvisioningDeps,
  params: EnsureFinanceWorkspaceReadyParams
): Promise<FinanceReadinessResult> {
  const trigger = params.trigger ?? 'app_activation'
  log.info(
    { organization_id: params.organizationId, app_id: params.appId },
    'finance_readiness.started'
  )

  const financeResult = await reconcileFinanceConnections(deps, {
    organizationId: params.organizationId,
    appId: params.appId,
    strictSourceAppId: params.appId,
    trigger,
    limit: null,
  })

  if (financeResult.eventIds.length === 0) {
    log.error(
      { organization_id: params.organizationId, app_id: params.appId },
      'finance_readiness.failed_no_event'
    )
    throw new AppHttpError({
      code: 'provisioning/finance-workspace-unavailable',
      message: `The finance workspace could not be prepared for application ${params.appId}.`,
      httpStatus: 503,
    })
  }

  log.info(
    {
      organization_id: params.organizationId,
      app_id: params.appId,
      event_ids: financeResult.eventIds,
    },
    'finance_readiness.delivery_started'
  )

  try {
    await ensureFinanceProvisioningDelivered(financeResult.eventIds)
  } catch (error) {
    log.error(
      {
        organization_id: params.organizationId,
        app_id: params.appId,
        event_ids: financeResult.eventIds,
        err: error,
      },
      'finance_readiness.failed'
    )
    throw error
  }

  log.info(
    {
      organization_id: params.organizationId,
      app_id: params.appId,
      event_ids: financeResult.eventIds,
    },
    'finance_readiness.ready'
  )

  return {
    organizationId: params.organizationId,
    appId: params.appId,
    ready: true,
    eventIds: financeResult.eventIds,
  }
}
