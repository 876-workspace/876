import {
  isWidgetSize,
  type WidgetSize,
  type WidgetSizePolicy,
  resolveAllowedSize,
  shouldRememberSize,
} from '../types/widget-size'

const STORAGE_PREFIX = '876:widgets:size:v1'

export function widgetSizeStorageKey(host: string, widgetId: string): string {
  return `${STORAGE_PREFIX}:${host}:${widgetId}`
}

export function readStoredWidgetSize(
  host: string,
  widgetId: string,
  policy: WidgetSizePolicy
): WidgetSize | null {
  if (!shouldRememberSize(policy)) return null
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(
      widgetSizeStorageKey(host, widgetId)
    )
    if (!raw || !isWidgetSize(raw)) return null
    if (!policy.allowed.includes(raw)) return null
    return raw
  } catch {
    return null
  }
}

export function writeStoredWidgetSize(
  host: string,
  widgetId: string,
  size: WidgetSize,
  policy: WidgetSizePolicy
): void {
  if (!shouldRememberSize(policy)) return
  if (typeof window === 'undefined') return
  if (!policy.allowed.includes(size)) return

  try {
    window.localStorage.setItem(widgetSizeStorageKey(host, widgetId), size)
  } catch {
    // Quota / private mode — ignore
  }
}

/** Resolve the effective size: stored (if allowed) → policy default. */
export function resolveInitialWidgetSize(
  host: string,
  widgetId: string,
  policy: WidgetSizePolicy
): WidgetSize {
  const stored = readStoredWidgetSize(host, widgetId, policy)
  return resolveAllowedSize(stored ?? undefined, policy)
}
