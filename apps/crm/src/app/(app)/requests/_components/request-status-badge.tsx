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
import type { RequestStatus } from '@/types/crm'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const STATUS_CONFIG: Record<
  RequestStatus,
  {
    label: string
    variant: BadgeVariant
    icon: typeof AlertCircle
  }
> = {
  OPEN: {
    label: 'Open',
    variant: 'info',
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'In progress',
    variant: 'warning',
    icon: Activity,
  },
  WAITING: {
    label: 'Waiting',
    variant: 'secondary',
    icon: Clock,
  },
  RESOLVED: {
    label: 'Resolved',
    variant: 'success',
    icon: CheckCircle,
  },
  CLOSED: {
    label: 'Closed',
    variant: 'secondary',
    icon: CheckIcon,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
  },
}

export function RequestStatusBadge({
  status,
  className,
}: {
  status: RequestStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replaceAll('_', ' '),
    variant: 'secondary' as const,
    icon: AlertCircle,
  }
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}
