import type { OrgMember } from './member-types'

export function memberName(member: OrgMember): string {
  return (
    [member.first_name, member.last_name].filter(Boolean).join(' ') ||
    member.email ||
    member.user_id
  )
}

export function memberInitials(member: OrgMember): string {
  return memberName(member)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function memberRoleLabel(role: string): string {
  return role
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
