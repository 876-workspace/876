import type { AppError as AppErrorValue } from '@876/core'
import type { ReactNode } from 'react'

import { ExclamationTriangleIcon } from '../icons'
import { cn } from '../lib/utils'

type AppErrorVariant = 'page' | 'section' | 'form' | 'inline'

type AppErrorProps = {
  error: AppErrorValue
  title?: string
  action?: ReactNode
  variant?: AppErrorVariant
  className?: string
}

/**
 * Renders a registered application error without discarding its stable code.
 * The error message and code come from the owning error catalog; this component
 * only controls presentation.
 */
export function AppError({
  error,
  title,
  action,
  variant = 'section',
  className,
}: AppErrorProps) {
  const isPage = variant === 'page'
  const isInline = variant === 'inline'
  const isForm = variant === 'form'

  if (isInline)
    return (
      <div
        role="alert"
        className={cn('text-destructive space-y-0.5 text-sm', className)}
      >
        <p>{error.message}</p>
        <AppErrorCode code={error.code} />
      </div>
    )

  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/20 bg-destructive/[0.035] rounded-lg border',
        isPage
          ? 'flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center'
          : isForm
            ? 'px-4 py-3'
            : 'px-5 py-6',
        className
      )}
    >
      <div
        className={cn(
          'bg-destructive/10 text-destructive flex size-9 items-center justify-center rounded-full',
          isPage ? 'mb-4 size-10' : 'mb-3'
        )}
        aria-hidden="true"
      >
        <ExclamationTriangleIcon className="size-5" />
      </div>
      {title ? (
        <p className={cn('font-medium', isPage && 'text-base')}>{title}</p>
      ) : null}
      <p
        className={cn(
          'text-muted-foreground text-sm',
          title && 'mt-1',
          isPage && 'max-w-md'
        )}
      >
        {error.message}
      </p>
      <AppErrorCode code={error.code} className="mt-2" />
      {action ? <div className="mt-4">{action}</div> : null}
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
