export { formatDate, formatDateTime } from '@876/core/timestamps'

export function accountTypeBadgeVariant(
  accountType: string
): 'default' | 'secondary' | 'outline' {
  if (accountType === 'enterprise') return 'default'
  return 'secondary'
}

export function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'secondary'
    case 'suspended':
    case 'inactive':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400'
    case 'suspended':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400'
    case 'inactive':
      return 'border-slate-400/40 bg-slate-400/10 text-slate-600 dark:text-slate-400'
    case 'banned':
      return 'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400'
    default:
      return 'border-border bg-muted/40 text-muted-foreground'
  }
}

export function accountTypeBadgeClass(accountType: string): string {
  switch (accountType) {
    case 'enterprise':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400'
    case 'consumer':
    default:
      return 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400'
  }
}

export function membershipStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'secondary'
    case 'invited':
      return 'default'
    case 'suspended':
    case 'removed':
      return 'destructive'
    default:
      return 'outline'
  }
}
