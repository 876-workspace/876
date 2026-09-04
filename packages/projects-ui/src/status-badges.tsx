import { Badge } from '@876/ui/badge'
import type { ProjectHealth, ProjectStatus } from '@876/projects/contracts'

export function formatIssueStatus(status: string): string {
  switch (status) {
    case 'backlog':
      return 'Backlog'
    case 'todo':
      return 'Todo'
    case 'in-progress':
      return 'In Progress'
    case 'in-review':
      return 'In Review'
    case 'done':
      return 'Done'
    case 'canceled':
      return 'Canceled'
    default:
      return status
  }
}

export function IssueStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  switch (status) {
    case 'backlog':
      return (
        <Badge variant="secondary" className={className}>
          Backlog
        </Badge>
      )
    case 'todo':
      return (
        <Badge variant="outline" className={className}>
          Todo
        </Badge>
      )
    case 'in-progress':
      return (
        <Badge variant="warning" className={className}>
          In Progress
        </Badge>
      )
    case 'in-review':
      return (
        <Badge variant="info" className={className}>
          In Review
        </Badge>
      )
    case 'done':
      return (
        <Badge variant="success" className={className}>
          Done
        </Badge>
      )
    case 'canceled':
      return (
        <Badge variant="secondary" className={className}>
          Canceled
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className={className}>
          {status}
        </Badge>
      )
  }
}

export function formatProjectStatus(status: ProjectStatus): string {
  switch (status) {
    case 'planned':
      return 'Planned'
    case 'active':
      return 'Active'
    case 'paused':
      return 'Paused'
    case 'completed':
      return 'Completed'
    case 'canceled':
      return 'Canceled'
    default:
      return status
  }
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus
  className?: string
}) {
  switch (status) {
    case 'planned':
      return (
        <Badge variant="outline" className={className}>
          Planned
        </Badge>
      )
    case 'active':
      return (
        <Badge variant="info" className={className}>
          Active
        </Badge>
      )
    case 'paused':
      return (
        <Badge variant="warning" className={className}>
          Paused
        </Badge>
      )
    case 'completed':
      return (
        <Badge variant="success" className={className}>
          Completed
        </Badge>
      )
    case 'canceled':
      return (
        <Badge variant="secondary" className={className}>
          Canceled
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className={className}>
          {status}
        </Badge>
      )
  }
}

export function formatProjectHealth(health: ProjectHealth): string {
  switch (health) {
    case 'on-track':
      return 'On track'
    case 'at-risk':
      return 'At risk'
    case 'off-track':
      return 'Off track'
    default:
      return health
  }
}

export function ProjectHealthBadge({
  health,
  className,
}: {
  health: ProjectHealth
  className?: string
}) {
  switch (health) {
    case 'on-track':
      return (
        <Badge variant="success" className={className}>
          On track
        </Badge>
      )
    case 'at-risk':
      return (
        <Badge variant="warning" className={className}>
          At risk
        </Badge>
      )
    case 'off-track':
      return (
        <Badge variant="destructive" className={className}>
          Off track
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className={className}>
          {health}
        </Badge>
      )
  }
}
