export const APP_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
] as const

/**
 * Return a stable fallback color for an app that does not have a logo yet.
 *
 * The color is derived only from the app's stable identifier, so the same app
 * keeps the same color across tables, requests, and browser refreshes. This is
 * intentionally deterministic rather than random or list-position based.
 */
export function appColor(
  appKey: string | null | undefined
): (typeof APP_COLORS)[number] {
  // Both of a subscription's app identifiers are nullable, so a caller can
  // legitimately have neither. A detail panel must not crash over a missing
  // label — an unkeyed app just takes the first colour, deterministically.
  const key = (appKey ?? '').trim().toLowerCase()
  let hash = 0

  for (let i = 0; i < key.length; i++)
    hash = (hash * 31 + key.charCodeAt(i)) | 0

  return APP_COLORS[Math.abs(hash) % APP_COLORS.length]!
}
