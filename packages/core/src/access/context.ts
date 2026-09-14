export interface AccessContext {
  /** The acting subject. */
  subject: { userId: string; accountType?: string | null }
  /** Effective module keys for organization capabilities available this request. */
  modules?: readonly string[]
  /** Effective permission keys, already resolved and catalog-intersected. */
  permissions: readonly string[]
  /** Enabled feature-flag keys. */
  features: readonly string[]
  /** PostHog experiment variant assignments. Presentational use ONLY. */
  experiments: Readonly<Record<string, string>>
}

function stringValues(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/** Returns whether a request-scoped access context has a module available. */
export function hasModule(context: AccessContext, module: string): boolean {
  try {
    if (typeof module !== 'string' || module.length === 0) return false

    const value = context as unknown as { modules?: unknown } | null
    return stringValues(value?.modules).includes(module)
  } catch {
    return false
  }
}

/** Returns whether a request-scoped access context holds a permission. */
export function can(context: AccessContext, permission: string): boolean {
  try {
    if (typeof permission !== 'string' || permission.length === 0) return false

    const value = context as unknown as { permissions?: unknown } | null
    return stringValues(value?.permissions).includes(permission)
  } catch {
    return false
  }
}

/** Returns whether a request-scoped access context has a feature enabled. */
export function hasFeature(context: AccessContext, feature: string): boolean {
  try {
    if (typeof feature !== 'string' || feature.length === 0) return false

    const value = context as unknown as { features?: unknown } | null
    return stringValues(value?.features).includes(feature)
  } catch {
    return false
  }
}

/** Returns an experiment variant for presentational code, never authorization. */
export function variantOf(
  context: AccessContext,
  experiment: string
): string | null {
  try {
    if (typeof experiment !== 'string' || experiment.length === 0) return null

    const value = context as unknown as { experiments?: unknown } | null
    if (
      !value?.experiments ||
      typeof value.experiments !== 'object' ||
      Array.isArray(value.experiments)
    )
      return null

    const variant = (value.experiments as Record<string, unknown>)[experiment]
    return typeof variant === 'string' ? variant : null
  } catch {
    return null
  }
}
