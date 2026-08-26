import type { VariantProps } from 'class-variance-authority'
import { Badge, type badgeVariants } from '@876/ui/badge'
import { ExclamationTriangleIcon, Minus, TrendingUp } from '@876/ui/icons'
import type { RequestPriority } from '@/types/crm'

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

const PRIORITY_CONFIG: Record<
  RequestPriority,
  {
    label: string
    variant: BadgeVariant
    icon: typeof Minus
  }
> = {
  LOW: {
    label: 'Low',
    variant: 'secondary',
    icon: Minus,
  },
  NORMAL: {
    label: 'Normal',
    variant: 'outline',
    icon: Minus,
  },
  HIGH: {
    label: 'High',
    variant: 'warning',
    icon: TrendingUp,
  },
  URGENT: {
    label: 'Urgent',
    variant: 'destructive',
    icon: ExclamationTriangleIcon,
  },
}

export function RequestPriorityBadge({
  priority,
  className,
}: {
  priority: RequestPriority
  className?: string
}) {
  const config = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    variant: 'outline' as const,
    icon: Minus,
  }
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  )
}
