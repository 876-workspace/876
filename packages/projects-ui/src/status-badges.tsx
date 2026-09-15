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
        .replaceAll('-', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }
}

export function IssueStatusBadge({
  status,
  label,
  className,
}: {
  status: string
  label?: string
  className?: string
}) {
  const content = label ?? formatIssueStatus(status)

  switch (status) {
    case 'backlog':
      return (
        <Badge variant="secondary" className={className}>
          {content}
        </Badge>
      )
    case 'todo':
      return (
        <Badge variant="outline" className={className}>
          {content}
        </Badge>
      )
    case 'in-progress':
      return (
        <Badge variant="warning" className={className}>
          {content}
        </Badge>
      )
    case 'in-review':
      return (
        <Badge variant="info" className={className}>
          {content}
        </Badge>
      )
    case 'done':
      return (
        <Badge variant="success" className={className}>
          {content}
        </Badge>
      )
    case 'canceled':
      return (
        <Badge variant="secondary" className={className}>
          {content}
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className={className}>
          {content}
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

/** Solid avatar colour for an issue's workflow state on phone lists. */
export function issueStatusTone(status: string): string {
  switch (status) {
    case 'todo':
      return 'bg-sky-500'
    case 'in-progress':
      return 'bg-amber-500'
    case 'in-review':
      return 'bg-violet-500'
    case 'done':
      return 'bg-emerald-500'
    case 'canceled':
      return 'bg-zinc-400'
    default:
      return 'bg-slate-400'
  }
}
