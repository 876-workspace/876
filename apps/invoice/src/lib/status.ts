export function documentStatusVariant(
  status: string
):
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'info'
  | 'success'
  | 'warning' {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'ACCEPTED':
    case 'CLOSED':
      return 'success'
    case 'OPEN':
    case 'SENT':
    case 'ISSUED':
      return 'info'
    case 'PAST_DUE':
    case 'OVERDUE':
    case 'EXPIRED':
      return 'warning'
    case 'VOID':
    case 'UNCOLLECTIBLE':
    case 'DECLINED':
    case 'REJECTED':
      return 'destructive'
    default:
      return 'secondary'
  }
}
