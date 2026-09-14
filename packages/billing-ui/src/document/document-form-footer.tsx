import type { ReactNode } from 'react'

import { cn } from '@876/ui/lib/utils'

import type {
  DocumentLineDraft,
  DocumentTotalsSnapshot,
} from './document-line-items-editor'

export interface DocumentFormFooterProps {
  /** The form's actions, primary first. */
  children: ReactNode
  /** The formatted grand total, or `—` while it cannot be calculated. */
  totalAmount: string
  totalQuantity: number
  className?: string
}

/**
 * The action bar pinned to the bottom of a document form, so saving and the
 * running total stay in reach however long the line items grow.
 */
export function DocumentFormFooter({
  children,
  totalAmount,
  totalQuantity,
  className,
}: DocumentFormFooterProps) {
  return (
    <div
      className={cn(
        'border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-10 -mx-[var(--876-shell-gutter)] mt-8 -mb-8 flex flex-wrap items-center justify-between gap-3 border-t px-[var(--876-shell-gutter)] py-3 backdrop-blur',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums">
          Total amount: {totalAmount}
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          Total quantity: {totalQuantity}
        </p>
      </div>
    </div>
  )
}

/** The grand total for the footer, or an em dash while it cannot be calculated. */
export function documentFooterTotal(
  snapshot: DocumentTotalsSnapshot | null,
  formatAmount: (minorUnits: bigint) => string
) {
  return snapshot?.status === 'ready'
    ? formatAmount(snapshot.totals.totalAmount)
    : '—'
}

/** Sum of the whole, positive quantities typed so far. */
export function documentTotalQuantity(lines: readonly DocumentLineDraft[]) {
  return lines.reduce((sum, line) => {
    const quantity = Number(line.quantity)
    return Number.isInteger(quantity) && quantity > 0 ? sum + quantity : sum
  }, 0)
}
