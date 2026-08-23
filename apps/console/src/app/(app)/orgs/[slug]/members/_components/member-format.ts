import type { AdminOrgMember } from '@876/admin'

export function initialsOf(user: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}): string {
  return (
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    '?'
  )
}

export function memberDisplayName(
  member: Pick<AdminOrgMember, 'first_name' | 'last_name' | 'user_id'>
): string {
  return (
    [member.first_name, member.last_name].filter(Boolean).join(' ').trim() ||
    member.user_id
  )
}

export function roleBadgeClass(role: string): string {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'border-876-gold/40 text-876-gold-fg bg-876-gold/10'
    case 'admin':
      return 'border-876-accent/40 text-876-accent-fg bg-876-accent/10'
    default:
      return 'border-border text-muted-foreground bg-muted/40'
  }
}

export function memberStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'border-876-green/40 text-876-green-fg bg-876-green/10'
    case 'inactive':
    case 'suspended':
      return 'border-destructive/40 text-destructive bg-destructive/10'
    default:
      return 'border-border text-muted-foreground bg-muted/40'
  }
}
