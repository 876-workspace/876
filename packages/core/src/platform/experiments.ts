export type ExperimentDecision<T = unknown> = {
  key: string
  enabled: boolean
  variant: string | null
  payload: T | null
  isControl: boolean
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
