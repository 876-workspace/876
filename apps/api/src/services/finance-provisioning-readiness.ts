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

export type AppFinanceExpectation = 'embedded'

export type EnsureAppReadyParams = {
  organizationId: string
  appId: string
  /**
   * When set, the app's published profile *must* declare this finance
   * dependency or readiness fails closed. Callers that know an app requires
   * finance (876 Invoice) pass `'embedded'` so a misconfigured profile can
   * never silently downgrade it to a finance-less product.
   *
   * Left undefined for the generic bootstrap path, which derives the
   * requirement from the profile itself.
   */
  expectedFinanceDependency?: AppFinanceExpectation
  trigger?: ProvisioningRunTrigger
}

export type AppReadinessResult = {
  organizationId: string
  appId: string
  ready: true
  /** Whether this app required (and passed) a finance-workspace readiness pass. */
  financeRequired: boolean
  eventIds: string[]
}

/**
 * The single readiness contract for making one org/app pair fully usable.
 *
 * This is what every activation path — explicit subscription provisioning,
 * organization default-app bootstrap, and retry/reconcile — must call, so an
 * app can never be reported ready through a weaker path than another. The
 * decision of *whether* finance is required belongs here (the published
 * profile), not in the frontend and not duplicated per call site:
 *
 * - `financeDependency: 'none'` (or a missing profile) → the app is ready as
 *   soon as its entitlement exists; no Billing workspace is required. Every
 *   valid non-finance app (876-enterprise, 876-billing, console) takes this
 *   path and is unaffected by finance provisioning.
 * - `financeDependency: 'embedded'` → the Billing workspace is mandatory, so
 *   {@link ensureFinanceWorkspaceReady} runs and its post-condition must hold
 *   before the app is called ready.
 *
 * `expectedFinanceDependency` turns a "finance optional" derivation into a
 * "finance required" assertion: an app whose contract demands finance passes
 * it, so a missing profile — or one that unexpectedly declares `none` or no
 * scopes — fails closed instead of quietly skipping Billing.
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
    // An unexpected but non-finance-required app on a partially seeded
    // environment: worth shouting about, never a reason to fail a signup.
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
