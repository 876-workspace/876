import type { ReactNode } from 'react'

/**
 * The tier-3 metadata cell every Couriers workspace table uses.
 *
 * Dates, codes, and plain-text references are muted so each row keeps exactly
 * one tier-1 subject (`.claude/rules/app-layout.md` §12).
 */
export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground text-xs">{children}</span>
}
