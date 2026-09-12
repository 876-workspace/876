import { cn } from '@876/ui/lib/utils'

/**
 * Derives a two-letter monogram from a bank's short name, falling back to its
 * full name. Short names are already abbreviations (`NCB`), so their leading
 * letters read better than word initials.
 */
export function bankInitials(
  name: string | null | undefined,
  shortName?: string | null
): string {
  const source = (shortName ?? name ?? '').trim()
  if (!source) return '?'
  if (shortName?.trim()) return shortName.trim().slice(0, 2).toUpperCase()
  return (
    source
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

/**
 * Renders the printable account reference without ever touching the full
 * account number: only the branch transit and the stored last four travel
 * together. Missing parts are omitted; an em dash marks a fully unknown
 * reference so tables never render a blank cell.
 */
export function formatAccountNumber(
  transitNumber: string | null | undefined,
  accountNumberLast4: string | null | undefined
): string {
  const parts: string[] = []
  if (transitNumber) parts.push(transitNumber)
  if (accountNumberLast4) parts.push(`••••${accountNumberLast4}`)
  return parts.length ? parts.join(' · ') : '—'
}

export interface BankIdentityProps {
  bankName: string
  shortName?: string | null
  logoUrl?: string | null
  branchName?: string | null
  transitNumber?: string | null
  routingNumber?: string | null
  accountNumberLast4?: string | null
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Shared bank identity: directory logo (or a short-name monogram), the bank
 * name, the branch with its transit, and the masked account reference.
 * Presentation only — callers resolve the directory records in one batch call
 * per kind and pass the fields down.
 */
export function BankIdentity({
  bankName,
  shortName,
  logoUrl,
  branchName,
  transitNumber,
  routingNumber,
  accountNumberLast4,
  size = 'sm',
  className,
}: BankIdentityProps) {
  const branchLine = [branchName, transitNumber].filter(Boolean).join(' · ')
  const showAccountLine = Boolean(transitNumber ?? accountNumberLast4)
  const avatarSize =
    size === 'md' ? 'size-10 text-sm' : 'size-8 text-xs'

  return (
    <span className={cn('flex min-w-0 items-center gap-3', className)}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          className={cn(
            'shrink-0 rounded-md border object-contain bg-white',
            avatarSize
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md border font-semibold',
            avatarSize
          )}
        >
          {bankInitials(bankName, shortName)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium">{bankName}</span>
        {branchLine ? (
          <span className="text-muted-foreground block truncate text-xs">
            {branchLine}
          </span>
        ) : null}
        {showAccountLine ? (
          <span className="text-muted-foreground block truncate text-xs tabular-nums">
            {formatAccountNumber(transitNumber, accountNumberLast4)}
            {routingNumber ? ` · RT ${routingNumber}` : null}
          </span>
        ) : null}
      </span>
    </span>
  )
}
