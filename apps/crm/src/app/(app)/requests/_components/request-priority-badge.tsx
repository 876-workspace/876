import { PriorityTag } from '@/features/priorities/priority-tag'
import type { RequestPriority } from '@/types/crm'

export function RequestPriorityBadge({
  priority,
  className,
}: {
  priority: RequestPriority
  className?: string
}) {
  return (
    <PriorityTag
      name={priority.name}
      color={priority.color}
      size="sm"
      className={className}
    />
  )
}
