import { SoftBadge, type SoftBadgeTone } from '@/components/soft-badge'
import type { TeamMemberStatusValue } from '@/types/team'

const STATUS_TONE: Record<TeamMemberStatusValue, SoftBadgeTone> = {
  active: 'emerald',
  inactive: 'slate',
}

const STATUS_LABEL: Record<TeamMemberStatusValue, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

type Props = {
  status: TeamMemberStatusValue
}

export function MemberStatusBadge({ status }: Props) {
  return (
    <SoftBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</SoftBadge>
  )
}
