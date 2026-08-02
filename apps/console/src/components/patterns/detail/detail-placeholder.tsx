import type { IconComponent } from '@876/ui/icons'

/**
 * Reusable empty state for detail tab content that has no data wiring yet.
 * Renders a centered icon, label, and description inside a dashed card.
 */
export function DetailPlaceholder({
  icon: Icon,
  label,
  description,
}: {
  icon: IconComponent
  label: string
  description: string
}) {
  return (
    <div className="border-876-surface-border flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
      <span className="text-muted-foreground bg-876-surface mb-3 flex size-11 items-center justify-center rounded-xl border">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
    </div>
  )
}
