/**
 * Couriers serves lifecycle values as SCREAMING_SNAKE enums (`READY_FOR_PICKUP`,
 * `PRE_ALERT`). They are durable wire values, so they are humanized for display
 * rather than renamed at the contract (`.claude/rules/naming.md`).
 */
export function enumLabel(value: string): string {
  const spaced = value.replace(/_/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
