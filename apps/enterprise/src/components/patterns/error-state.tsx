import { TriangleAlertIcon } from '@876/ui/icons'

/**
 * Inline error surface for failed data loads. Pages render this in place of
 * the section that failed instead of throwing — errors stay values all the
 * way to the UI.
 */
export function ErrorState({
  error,
}: {
  error: { code: string; message: string }
}) {
  return (
    <div className="876-card flex items-start gap-3 p-5">
      <span className="bg-destructive/10 text-destructive flex size-8 shrink-0 items-center justify-center rounded-md">
        <TriangleAlertIcon aria-hidden="true" className="size-4" />
      </span>
      <div>
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-muted-foreground mt-0.5 text-sm">{error.message}</p>
        <p className="text-muted-foreground/70 mt-1 font-mono text-xs">
          {error.code}
        </p>
      </div>
    </div>
  )
}
