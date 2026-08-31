import type { AdminOrgMember, AdminUser } from '@876/platform/compat'
import { formatDateTime } from '@/lib/format'
import { cn } from '@876/core/utils'

type ActivityEvent = {
  at: number
  label: string
  detail?: string
  tone: 'neutral' | 'info' | 'warn' | 'danger'
}

const toneDotClass: Record<ActivityEvent['tone'], string> = {
  neutral: 'bg-muted-foreground/50',
  info: 'bg-emerald-500',
  warn: 'bg-amber-500',
  danger: 'bg-red-500',
}

function lifecycleEvents(
  member: AdminOrgMember,
  user?: AdminUser | null
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  if (member.created_at) {
    events.push({
      at: member.created_at,
      label: 'Joined organization',
      detail: `Role assigned: ${member.role}`,
      tone: 'info',
    })
  }

  if (user?.created_at && user.created_at !== member.created_at) {
    events.push({
      at: user.created_at,
      label: 'User account created',
      tone: 'neutral',
    })
  }

  if (user?.updated_at && user.updated_at > member.created_at) {
    events.push({
      at: user.updated_at,
      label: 'User profile updated',
      tone: 'neutral',
    })
  }

  return events.sort((a, b) => b.at - a.at)
}

export function MemberActivity({
  member,
  user,
}: {
  member: AdminOrgMember
  user?: AdminUser | null
}) {
  const events = lifecycleEvents(member, user)

  return (
    <ol className="relative space-y-4 ps-1">
      {events.map((event, index) => (
        <li key={`${event.label}-${event.at}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                toneDotClass[event.tone]
              )}
            />
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-876-surface-border w-px grow"
              />
            )}
          </div>
          <div className="-mt-0.5 min-w-0 pb-0.5">
            <p className="text-[0.8125rem] leading-5 font-medium">
              {event.label}
            </p>
            <p className="text-muted-foreground text-xs">
              {`${formatDateTime(event.at)}${event.detail ? ` · ${event.detail}` : ''}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
