import { cn } from '@876/core/utils'
import { TagIcon } from '@876/ui/icons'

import { priorityColorVariant } from './priority-color'

/**
 * A priority is a label, so it renders as a coloured tag everywhere — the icon
 * and the name both take the priority's colour, with no pill behind them.
 */
export function PriorityTag({
  name,
  color,
  size = 'md',
  className,
}: {
  name: string
  color?: string | null
  size?: 'sm' | 'md'
  className?: string
}) {
  const variant = priorityColorVariant(color)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium whitespace-nowrap',
        size === 'sm' ? 'text-xs' : 'text-sm',
        variant.text,
        className
      )}
    >
      <TagIcon
        className={cn('shrink-0', size === 'sm' ? 'size-3.5' : 'size-4')}
        aria-hidden="true"
      />
      {name}
    </span>
  )
}
