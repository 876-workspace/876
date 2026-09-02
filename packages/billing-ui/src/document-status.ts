/** Badge variants the shared finance surfaces use. Mirrors `@876/ui`'s Badge. */
export type DocumentStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'info'
  | 'success'
  | 'warning'

/**
 * Badge variant for a sales-document status (invoice, quote, estimate, credit
 * note). One mapping for all of them, so the same word never renders in two
 * different colours across the invoicing section — or across two apps, which
 * is why it lives here rather than in each host.
 */
export function documentStatusVariant(status: string): DocumentStatusVariant {
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
