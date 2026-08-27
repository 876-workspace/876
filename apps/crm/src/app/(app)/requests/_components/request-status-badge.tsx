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

type RequestStatusConfig = {
  label: string
  variant: BadgeVariant
  icon: typeof AlertCircle
  /**
   * The same palette as the badge, applied to an interactive surface: a 10%
   * tint, the status colour as text, and a hairline of it. A control that
   * *carries* a status has to read as that status, but it is still a control —
   * so it stays a tinted surface with coloured text, never a solid fill, which
   * is what would make it read as a primary action.
   *
   * Every state is spelled out because the Button's `outline` variant sets
   * `hover:`, `aria-expanded:` and `dark:` colours of its own, and
   * tailwind-merge only drops a class when the override carries the *same*
   * modifier. Without the full set the trigger reverts to neutral grey the
   * moment it is hovered, opened, or viewed in dark mode.
   *
   * The class strings are literal on purpose: Tailwind scans source text, so a
   * composed `bg-${color}/10` would never be generated.
   */
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

/**
 * The status's label, icon, badge variant, and interactive tint.
 *
 * Exported so a control that *is* the status — the record toolbar's status
 * selector — reads from the same table the badge does. Two tables would drift,
 * and a status whose pill and whose selector disagree on colour is worse than
 * either choice on its own.
 */
export function requestStatusConfig(
  status: RequestStatus
): RequestStatusConfig {
  return (
    STATUS_CONFIG[status] ?? {
      ...FALLBACK_CONFIG,
      label: status.replaceAll('_', ' '),
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
