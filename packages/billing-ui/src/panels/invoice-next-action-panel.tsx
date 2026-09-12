import { Button, buttonVariants } from '@876/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import { cn } from '@876/ui/lib/utils'

import { collectibleStatuses } from '../invoice-status'
import { Link } from '../link'

import type { PanelProps } from './panel'

export interface InvoiceNextActionPanelProps extends PanelProps {
  status: string
  recordPaymentHref: string
  /** Formatted outstanding balance. The one figure that decides whether to chase this today. */
  balance?: string
}

/**
 * The action strip above an unpaid invoice. Deliberately not a PanelFrame: a
 * one-line prompt inside a titled card reads as a section of the document
 * rather than a prompt about it, and spends a band of vertical space saying
 * very little.
 */
export function InvoiceNextActionPanel({
  status,
  recordPaymentHref,
  balance,
  className,
}: InvoiceNextActionPanelProps) {
  if (!collectibleStatuses.has(status)) return null

  const overdue = status === 'OVERDUE'

  return (
    <div
      className={cn(
        'bg-muted/40 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border px-4 py-3 print:hidden',
        className
      )}
    >
      <p className="flex items-center gap-2.5 text-sm">
        <span
          aria-hidden
          className={cn(
            'size-2 shrink-0 rounded-full',
            overdue ? 'bg-amber-500' : 'bg-muted-foreground/40'
          )}
        />
        <span className="font-medium">
          {overdue ? 'Payment is overdue' : 'Awaiting payment'}
        </span>
        {balance ? (
          <span className="text-muted-foreground tabular-nums">
            {balance} outstanding
          </span>
        ) : null}
      </p>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button type="button" variant="ghost" size="sm" disabled>
              Send reminder
            </Button>
          </TooltipTrigger>
          <TooltipContent>Email delivery is not configured yet.</TooltipContent>
        </Tooltip>
        <Link
          href={recordPaymentHref}
          className={cn(buttonVariants({ variant: 'info', size: 'sm' }))}
        >
          Record payment
        </Link>
      </div>
    </div>
  )
}
