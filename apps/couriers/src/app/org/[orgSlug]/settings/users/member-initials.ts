/**
 * Builds up to two uppercase initials from a display name for avatar fallbacks.
 *
 * Takes the first character of the first two whitespace-separated parts
 * (e.g. `"Alejandra Reyes"` → `"AR"`, `"Malik"` → `"M"`). Empty or
 * whitespace-only input returns an empty string.
 *
 * @param name - Full or partial display name.
 * @returns One or two uppercase initials, or `""` when none can be derived.
 */
export function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
