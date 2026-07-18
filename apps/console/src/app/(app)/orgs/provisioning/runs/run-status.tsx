import { Badge } from '@876/ui/badge'
import { cn } from '@876/core/utils'
import type { AdminProvisioningRunStatus } from '@876/admin'

const styles: Record<AdminProvisioningRunStatus, string> = {
  queued: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  processing:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  succeeded:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
  failed: 'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400',
}

export function RunStatus({ status }: { status: AdminProvisioningRunStatus }) {
  return (
    <Badge variant="outline" className={cn('capitalize', styles[status])}>
      {status}
    </Badge>
  )
}
