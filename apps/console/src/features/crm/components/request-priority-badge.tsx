import { Badge } from '@876/ui/badge'
import type { RequestPriority } from '../types'

export function RequestPriorityBadge({
  priority,
  className,
}: {
  priority: RequestPriority
  className?: string
}) {
  return (
    <Badge
      variant={priority.isDefault ? 'outline' : 'secondary'}
      className={className}
      style={
        priority.color
          ? { borderColor: priority.color, color: priority.color }
          : undefined
      }
    >
      {priority.name}
    </Badge>
  )
}
