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

/** Guarantees that the exact organization/app finance workspace is delivered. */
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
 * The single readiness contract for one organization/app pair.
 *
 * The application provisioning profile is selected and persisted before this
 * function is called. Readiness therefore consumes that exact profile's
 * published manifest; it never re-routes and never substitutes the app's current
 * default profile on retry.
 */
export async function ensureAppReady(
  deps: FinanceProvisioningDeps,
  params: EnsureAppReadyParams
): Promise<AppReadinessResult> {
  const expectEmbedded = params.expectedFinanceDependency === 'embedded'
  const financeLess = (): AppReadinessResult => ({
    organizationId: params.organizationId,
    appId: params.appId,
    ready: true,
    financeRequired: false,
    eventIds: [],
  })

  const selected = await deps.repository.resolveApplicationProfileSelection(
    params.organizationId,
    params.appId
  )
  if (!selected) {
    log.error(
      { organization_id: params.organizationId, app_id: params.appId },
      'app_readiness.profile_selection_missing'
    )
    throw new AppHttpError({
      code: 'provisioning/application-profile-selection-missing',
      message:
        'The organization has no persisted provisioning profile for this application.',
      httpStatus: 409,
    })
  }

  const profile = await deps.repository.findPublishedRevision(
    'application',
    selected.manifestTargetKey
  )
  if (!profile) {
    if (expectEmbedded) {
      throw new AppHttpError({
        code: 'provisioning/application-profile-missing',
        message: `Published provisioning profile ${selected.profileKey} is missing for application ${params.appId}.`,
        httpStatus: 503,
      })
    }
    log.warn(
      {
        organization_id: params.organizationId,
        app_id: params.appId,
        profile_id: selected.profileId,
        profile_key: selected.profileKey,
      },
      'app_readiness.profile_missing_non_strict'
    )
    return financeLess()
  }

  if (profile.financeDependency !== 'embedded') {
    if (expectEmbedded)
      throw new AppHttpError({
        code: 'provisioning/finance-dependency-missing',
        message: `Application ${params.appId} requires embedded finance but selected profile ${selected.profileKey} declares no finance dependency.`,
        httpStatus: 503,
      })
    return financeLess()
  }

  if (profile.financeScopes.length === 0)
    throw new AppHttpError({
      code: 'provisioning/finance-scopes-missing',
      message: `Application profile ${selected.profileKey} declares embedded finance without scopes.`,
      httpStatus: 503,
    })

  const setupKey = await deps.repository.resolveFinanceSetupKey(
    params.organizationId
  )
  if (!setupKey)
    throw new AppHttpError({
      code: 'provisioning/setup-selection-missing',
      message:
        'The organization has no persisted provisioning setup. Run the provisioning setup backfill before retrying.',
      httpStatus: 409,
    })

  const financeProfile = await deps.repository.findPublishedRevision(
    'finance',
    setupKey
  )
  if (!financeProfile)
    throw new AppHttpError({
      code: 'provisioning/finance-profile-missing',
      message: `Published finance provisioning profile is missing for setup ${setupKey}.`,
      httpStatus: 503,
    })

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
