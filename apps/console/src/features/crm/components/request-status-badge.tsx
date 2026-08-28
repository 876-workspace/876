import type { VariantProps } from 'class-variance-authority'
import { Badge, type badgeVariants } from '@876/ui/badge'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  CheckIcon,
  Clock,
  XCircle,
} from '@876/ui/icons'
import type { RequestStatus } from '../types'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

type RequestStatusConfig = {
  label: string
  variant: BadgeVariant
  icon: typeof AlertCircle
  trigger: string
}

const SECONDARY_TRIGGER =
  'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-secondary-foreground aria-expanded:bg-secondary/80 aria-expanded:text-secondary-foreground dark:bg-secondary dark:hover:bg-secondary/80'

const STATUS_CONFIG: Record<RequestStatus, RequestStatusConfig> = {
  OPEN: {
    label: 'Open',
    variant: 'info',
    icon: Clock,
    trigger:
      'border-info/20 bg-info/10 text-info hover:bg-info/20 hover:text-info aria-expanded:bg-info/20 aria-expanded:text-info dark:bg-info/15 dark:hover:bg-info/25',
  },
  IN_PROGRESS: {
    label: 'In progress',
    variant: 'warning',
    icon: Activity,
    trigger:
      'border-warning/20 bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning aria-expanded:bg-warning/20 aria-expanded:text-warning dark:bg-warning/15 dark:hover:bg-warning/25',
  },
  WAITING: {
    label: 'Waiting',
    variant: 'secondary',
    icon: Clock,
    trigger: SECONDARY_TRIGGER,
  },
  RESOLVED: {
    label: 'Resolved',
    variant: 'success',
    icon: CheckCircle,
    trigger:
      'border-success/20 bg-success/10 text-success hover:bg-success/20 hover:text-success aria-expanded:bg-success/20 aria-expanded:text-success dark:bg-success/15 dark:hover:bg-success/25',
  },
  CLOSED: {
    label: 'Closed',
    variant: 'secondary',
    icon: CheckIcon,
    trigger: SECONDARY_TRIGGER,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
    trigger:
      'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive aria-expanded:bg-destructive/20 aria-expanded:text-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30',
  },
}

const FALLBACK_CONFIG: Omit<RequestStatusConfig, 'label'> = {
  variant: 'secondary',
  icon: AlertCircle,
  trigger: SECONDARY_TRIGGER,
}

export function requestStatusConfig(
  status: RequestStatus
): RequestStatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      ...FALLBACK_CONFIG,
      label: (status as string).replaceAll('_', ' '),
    }
  )
}

export function RequestStatusBadge({
  status,
  className,
}: {
  status: RequestStatus
  className?: string
}) {
  const config = requestStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}
