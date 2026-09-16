import { Badge } from '@876/ui/badge'

import type { CustomModuleStatus } from './types'

export type RecordStatusBadgeProps = {
  statusKey: string
  statuses?: readonly CustomModuleStatus[]
  label?: string
  category?: CustomModuleStatus['category']
}

function resolveStatus(
  statusKey: string,
  statuses: readonly CustomModuleStatus[] | undefined,
  label: string | undefined,
  category: CustomModuleStatus['category'] | undefined
): { label: string; category: CustomModuleStatus['category'] | null } {
  const match = statuses?.find((status) => status.key === statusKey)

  return {
    label: label ?? match?.label ?? statusKey,
    category: category ?? match?.category ?? null,
  }
}

export function RecordStatusBadge({
  statusKey,
  statuses,
  label,
  category,
  className,
}: RecordStatusBadgeProps & { className?: string }) {
  const resolved = resolveStatus(statusKey, statuses, label, category)

  switch (resolved.category) {
    case 'open':
      return (
        <Badge variant="outline" className={className}>
          {resolved.label}
        </Badge>
      )
    case 'in-progress':
      return (
        <Badge variant="warning" className={className}>
          {resolved.label}
        </Badge>
      )
    case 'done':
      return (
        <Badge variant="success" className={className}>
          {resolved.label}
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className={className}>
          {resolved.label}
        </Badge>
      )
  }
}
