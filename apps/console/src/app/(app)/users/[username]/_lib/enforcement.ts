import type { AdminUser } from '@876/admin'

import type { AccountShape, EnforcementTag } from '@/types/customer'
import { formatDate } from '@/lib/format'

/**
 * Every standing fact about an account, as header chips.
 *
 * Modelled on the leaked Twitter admin panel, where suspension, protection and
 * each blacklist read as one row of tags: an agent takes in the account's whole
 * standing at a glance instead of opening three dialogs to discover the user is
 * both banned and unverified. Ordered most-severe first.
 */
export function enforcementTags(user: AdminUser): EnforcementTag[] {
  const tags: EnforcementTag[] = []

  if (user.deleted_at)
    tags.push({
      key: 'deleted',
      label: 'Deleted',
      tone: 'danger',
      detail: formatDate(user.deleted_at),
    })

  if (user.banned)
    tags.push({
      key: 'banned',
      label: 'Banned',
      tone: 'danger',
      detail: user.banned_reason ?? undefined,
    })

  if (user.status === 'suspended')
    tags.push({ key: 'suspended', label: 'Suspended', tone: 'warning' })

  if (!user.email_verified)
    tags.push({
      key: 'email-unverified',
      label: 'Email unverified',
      tone: 'warning',
    })

  if (user.status === 'inactive')
    tags.push({ key: 'inactive', label: 'Inactive', tone: 'neutral' })

  if (user.platform_role)
    tags.push({
      key: 'platform-role',
      label: user.platform_role,
      tone: 'neutral',
    })

  // A clean account still needs one chip, or the header reads as "unknown"
  // rather than "fine" — absence of a warning is not the same as a clean bill.
  if (tags.length === 0)
    tags.push({ key: 'good-standing', label: 'Good standing', tone: 'neutral' })

  return tags
}

/** Chip classes per tone. Green stays reserved for status, never for a control. */
export function enforcementToneClass(tone: EnforcementTag['tone']): string {
  switch (tone) {
    case 'danger':
      return 'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400'
    case 'warning':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400'
    default:
      return 'border-border bg-muted/50 text-muted-foreground'
  }
}

/** Human label for a derived account shape. */
export function accountShapeLabel(shape: AccountShape): string {
  switch (shape) {
    case 'enterprise':
      return 'Enterprise'
    case 'dual':
      return 'Enterprise + Consumer'
    default:
      return 'Consumer'
  }
}

/**
 * Chip classes for the account shape. Deliberately reuses the existing
 * consumer/enterprise palette from `lib/format` rather than inventing a third.
 */
export function accountShapeClass(shape: AccountShape): string {
  switch (shape) {
    case 'enterprise':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400'
    case 'dual':
      return 'border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-400'
    default:
      return 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400'
  }
}
