export type ExperimentDecision<T = unknown> = {
  key: string
  enabled: boolean
  variant: string | null
  payload: T | null
  isControl: boolean
}

/** Identity context for an experiment evaluation. */
export interface ExperimentContext {
  userId?: string
  organizationId?: string
  visitorId?: string
}

/** One evaluated experiment decision as returned by `features.evaluateDetails`. */
export type ExperimentEvaluationDecision = {
  feature: { slug: string }
  enabled: boolean
  variant?: string | null
  payload?: unknown
}

/**
 * Minimal structural client for experiment evaluation. Only the
 * `features.evaluateDetails` path used by the shared resolver is required,
 * so apps pass their already-configured platform client without core
 * importing any app-owned client type.
 */
export interface PlatformExperimentClient {
  features: {
    evaluateDetails: (params: {
      appSlug: string
      userId?: string
      organizationId?: string
      visitorId?: string
    }) => Promise<{
      data: { data: readonly ExperimentEvaluationDecision[] } | null
      error: unknown
    }>
  }
}

export interface AppExperimentResolverOptions {
  appSlug: string
  /** The host's already-configured platform client accessor. */
  getPlatformClient: () => Promise<PlatformExperimentClient>
}

/**
 * Per-identity experiment decisions fetcher. Takes three primitives (never a
 * context object) so a host `cache()` wrapper keeps memoising by `Object.is`.
 */
export type ExperimentDecisionsFetcher = (
  userId: string | undefined,
  organizationId: string | undefined,
  visitorId: string | undefined
) => Promise<readonly ExperimentEvaluationDecision[] | null>

/**
 * Builds the unmemoised decisions fetcher for one app. The host wraps the
 * returned function with `cache()` exactly once for per-request memoisation;
 * core itself must not import `react`.
 */
export function createExperimentDecisionsFetcher(
  options: AppExperimentResolverOptions
): ExperimentDecisionsFetcher {
  const { appSlug, getPlatformClient } = options
  return async function fetchExperimentDecisions(
    userId: string | undefined,
    organizationId: string | undefined,
    visitorId: string | undefined
  ): Promise<readonly ExperimentEvaluationDecision[] | null> {
    const platform = await getPlatformClient()
    const { data, error } = await platform.features.evaluateDetails({
      appSlug,
      userId,
      organizationId,
      visitorId,
    })
    return error || !data ? null : data.data
  }
}

/**
 * Builds the per-app experiment resolver from its (host-memoised) decisions
 * accessor. The context object is destructured into primitives before the
 * accessor call so `Object.is` memoisation keeps working.
 */
export function createAppExperimentResolver(
  getDecisions: ExperimentDecisionsFetcher
): <T = unknown>(
  featureSlug: string,
  context?: ExperimentContext
) => Promise<ExperimentDecision<T>> {
  return async function resolveAppExperiment<T = unknown>(
    featureSlug: string,
    context?: ExperimentContext
  ): Promise<ExperimentDecision<T>> {
    return resolveExperimentDecision<T>(
      featureSlug,
      await getDecisions(
        context?.userId,
        context?.organizationId,
        context?.visitorId
      )
    )
  }
}

/**
 * Resolves an experiment from an evaluation response. A failed evaluation resolves
 * to disabled control by contract, preserving the platform resilience invariant.
 */
export function resolveExperimentDecision<T>(
  featureSlug: string,
  decisions:
    | readonly {
        feature: { slug: string }
        enabled: boolean
        variant?: string | null
        payload?: unknown
      }[]
    | null
): ExperimentDecision<T> {
  const match = decisions?.find(
    (decision) => decision.feature.slug === featureSlug
  )
  const enabled = match?.enabled ?? false
  const variant = enabled ? (match?.variant ?? null) : null
  const payload = enabled ? ((match?.payload as T | undefined) ?? null) : null

  return {
    key: featureSlug,
    enabled,
    variant,
    payload,
    isControl: !variant || variant === 'control',
  }
}
