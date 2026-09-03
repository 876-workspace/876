import { Skeleton } from '@876/ui/skeleton'

/**
 * Fallback for the Projects create routes.
 *
 * It is the shape of the card the form renders into — header, labelled rows,
 * footer buttons — rather than a grey bar, so the page does not shift when the
 * form arrives (`.claude/rules/data-loading.md`).
 */
export function CreateFormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="876-card max-w-2xl overflow-hidden">
      <div className="bg-muted/20 border-b px-5 py-3.5">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-5 p-5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="bg-muted/10 flex justify-end gap-2 border-t px-5 py-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  )
}
