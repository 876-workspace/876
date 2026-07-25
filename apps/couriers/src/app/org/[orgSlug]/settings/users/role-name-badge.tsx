import { SoftBadge, type SoftBadgeTone } from '@/components/soft-badge'

const ROLE_TONE: Record<string, SoftBadgeTone> = {
  admin: 'sky',
  staff: 'emerald',
}

type Props = {
  name: string
  systemKey: 'admin' | 'staff' | null
}

export function RoleNameBadge({ name, systemKey }: Props) {
  const tone = systemKey != null ? (ROLE_TONE[systemKey] ?? 'purple') : 'purple'

  return <SoftBadge tone={tone}>{name}</SoftBadge>
}
