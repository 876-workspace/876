import { Badge } from '@876/ui/badge'
import type { IssuePriority } from '@876/projects/contracts'

export function formatIssuePriority(priority: IssuePriority): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    case 'none':
    default:
      return 'None'
  }
}

export function IssuePriorityBadge({
  priority,
  className,
}: {
  priority: IssuePriority
  className?: string
}) {
  switch (priority) {
    case 'urgent':
      return (
        <Badge variant="destructive" className={className}>
          Urgent
        </Badge>
      )
    case 'high':
      return (
        <Badge variant="warning" className={className}>
          High
        </Badge>
      )
    case 'medium':
      return (
        <Badge variant="secondary" className={className}>
          Medium
        </Badge>
      )
    case 'low':
      return (
        <Badge variant="outline" className={className}>
          Low
        </Badge>
      )
    case 'none':
    default:
      return (
        <Badge variant="outline" className={className}>
          None
        </Badge>
      )
  }
}
