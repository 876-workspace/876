import type { ReactNode } from 'react'

import { ExclamationTriangleIcon } from '../icons'
import { cn } from '../lib/utils'

export type AppErrorValue = {
  code: string
  message: string
}

type AppErrorVariant = 'banner' | 'section' | 'form' | 'inline'

type AppErrorProps = {
  error: AppErrorValue
  title?: string
  action?: ReactNode
  variant?: AppErrorVariant
  className?: string
  showCode?: boolean
}

/**
 * A non-blocking application error notice.
 *
 * This component intentionally never becomes a full-page replacement. The page,
 * table shell, form, or record chrome should remain mounted so a failed request
 * does not look like the application itself crashed. Product apps normally keep
 * `showCode` false; internal surfaces such as Console can opt in.
 */
export function AppError({
  error,
  title,
  action,
  variant = 'section',
  className,
  showCode = false,
}: AppErrorProps) {
  const isInline = variant === 'inline'
  const isBanner = variant === 'banner'

  if (isInline)
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn('space-y-0.5 text-sm', className)}
      >
        {title ? <p className="font-medium">{title}</p> : null}
        <p className="text-muted-foreground">{error.message}</p>
        {showCode ? <AppErrorCode code={error.code} /> : null}
      </div>
    )

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border-border bg-muted/20 flex gap-3 rounded-lg border px-4 py-3',
        isBanner && 'items-start',
        className
      )}
    >
      <div
        className="bg-amber-500/10 text-amber-700 dark:text-amber-300 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <ExclamationTriangleIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <p className={cn('text-muted-foreground text-sm', title && 'mt-0.5')}>
          {error.message}
        </p>
        {showCode ? <AppErrorCode code={error.code} className="mt-1" /> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  )
}

export function AppErrorCode({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  return (
    <code
      className={cn(
        'text-muted-foreground block font-mono text-xs break-all',
        className
      )}
    >
      {code}
    </code>
  )
}
