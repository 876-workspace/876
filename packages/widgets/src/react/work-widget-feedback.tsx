'use client'

export function WorkWidgetErrorBanner({
  message,
  onAction,
  actionLabel = 'Try again',
}: {
  message: string | null
  onAction: () => void
  actionLabel?: string
}) {
  if (!message) return null
  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs">
      {message}
      <button
        type="button"
        onClick={onAction}
        className="ml-2 font-medium underline underline-offset-2"
      >
        {actionLabel}
      </button>
    </div>
  )
}

export function WorkWidgetInitialError({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-72 text-xs leading-5">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="border-876-surface-border bg-876-surface mt-4 rounded-lg border px-3 py-2 text-xs font-medium shadow-xs"
      >
        Try again
      </button>
    </div>
  )
}
