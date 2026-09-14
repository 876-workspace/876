type Props = { label: string }

/** Placeholder matching a finance section: heading row plus one table card. */
export function FinanceSectionSkeleton({ label }: Props) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <div className="flex items-center justify-between gap-3">
        <div className="bg-muted h-6 w-32 animate-pulse rounded" />
        <div className="bg-muted h-9 w-20 animate-pulse rounded-full" />
      </div>
      <div className="876-card h-48 animate-pulse" />
    </div>
  )
}
