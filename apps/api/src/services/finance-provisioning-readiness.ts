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

export type AppFinanceExpectation = 'embedded'

export type EnsureAppReadyParams = {
  organizationId: string
  appId: string
  expectedFinanceDependency?: AppFinanceExpectation
  trigger?: ProvisioningRunTrigger
}

export type AppReadinessResult = {
  organizationId: string
  appId: string
  ready: true
  financeRequired: boolean
  eventIds: string[]
}

/**
 * The single readiness contract for making one org/app pair fully usable.
 *
 * Finance-less applications return once their entitlement exists. Embedded
 * finance applications additionally require a persisted organization setup and
 * a published finance manifest for that exact setup. There is no runtime
 * fallback to the platform's current default setup in Phase 2.
 */
export async function ensureAppReady(
  deps: FinanceProvisioningDeps,
  params: EnsureAppReadyParams
): Promise<AppReadinessResult> {
  const expectEmbedded = params.expectedFinanceDependency === 'embedded'
  const notReady = (
    organizationId: string,
    appId: string
  ): AppReadinessResult => ({
    organizationId,
    appId,
    ready: true,
    financeRequired: false,
    eventIds: [],
  })

  const profile = await deps.repository.findPublishedRevision(
    'application',
    params.appId
  )

  if (!profile) {
    if (expectEmbedded) {
      log.error(
        { organization_id: params.organizationId, app_id: params.appId },
        'app_readiness.profile_missing'
      )
      throw new AppHttpError({
        code: 'provisioning/application-profile-missing',
        message: `Published provisioning profile is missing for application ${params.appId}.`,
        httpStatus: 503,
      })
    }
    log.warn(
      { organization_id: params.organizationId, app_id: params.appId },
      'app_readiness.profile_missing_non_strict'
    )
    return notReady(params.organizationId, params.appId)
  }

  if (profile.financeDependency !== 'embedded') {
    if (expectEmbedded) {
      log.error(
        {
          organization_id: params.organizationId,
          app_id: params.appId,
          finance_dependency: profile.financeDependency,
        },
        'app_readiness.finance_dependency_missing'
      )
      throw new AppHttpError({
        code: 'provisioning/finance-dependency-missing',
        message: `Application ${params.appId} requires foreground finance provisioning but its published profile declares no finance dependency.`,
        httpStatus: 503,
      })
    }
    return notReady(params.organizationId, params.appId)
  }

  if (profile.financeScopes.length === 0) {
    log.error(
      { organization_id: params.organizationId, app_id: params.appId },
      'app_readiness.finance_scopes_missing'
    )
    throw new AppHttpError({
      code: 'provisioning/finance-scopes-missing',
      message: `Application ${params.appId} declares embedded finance without scopes.`,
      httpStatus: 503,
    })
  }

  const setupKey = await deps.repository.resolveFinanceSetupKey(
    params.organizationId
  )
  if (!setupKey) {
    log.error(
      { organization_id: params.organizationId, app_id: params.appId },
      'app_readiness.setup_selection_missing'
    )
    throw new AppHttpError({
      code: 'provisioning/setup-selection-missing',
      message:
        'The organization has no persisted provisioning setup. Run the provisioning setup backfill before retrying.',
      httpStatus: 409,
    })
  }

  const financeProfile = await deps.repository.findPublishedRevision(
    'finance',
    setupKey
  )
  if (!financeProfile) {
    log.error(
      {
        organization_id: params.organizationId,
        app_id: params.appId,
        setup_key: setupKey,
      },
      'app_readiness.finance_profile_missing'
    )
    throw new AppHttpError({
      code: 'provisioning/finance-profile-missing',
      message: `Published finance provisioning profile is missing for setup ${setupKey}.`,
      httpStatus: 503,
    })
  }

  const result = await ensureFinanceWorkspaceReady(deps, {
    organizationId: params.organizationId,
    appId: params.appId,
    trigger: params.trigger,
  })

  return {
    organizationId: params.organizationId,
    appId: params.appId,
    ready: true,
    financeRequired: true,
    eventIds: result.eventIds,
  }
}
