import type { OrgMember } from '@/types/users'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  staff: 'Staff',
  super_admin: 'Super admin',
}

export function memberName(
  member: Pick<OrgMember, 'first_name' | 'last_name' | 'email' | 'id'>
): string {
  return (
    [member.first_name, member.last_name].filter(Boolean).join(' ') ||
    member.email ||
    member.id
  )
}

export function memberInitials(
  member: Pick<OrgMember, 'first_name' | 'last_name' | 'email'>
): string {
  return (
    [member.first_name?.[0], member.last_name?.[0]].filter(Boolean).join('') ||
    member.email?.[0] ||
    '?'
  ).toUpperCase()
}

export function memberRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replaceAll('_', ' ')
}

export function formatMemberDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(timestamp * 1000)
  )
}
