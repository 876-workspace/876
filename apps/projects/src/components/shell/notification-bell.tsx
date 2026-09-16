import Link from 'next/link'

import { Bell } from '@876/ui/icons'

export function NotificationBell({ count }: { count: number }) {
  const display = count > 99 ? '99+' : String(count)
  const label =
    count > 0 ? `Notifications, ${count} unread` : 'Notifications'

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="text-muted-foreground hover:bg-muted hover:text-foreground relative inline-flex size-8 items-center justify-center rounded-md transition-colors"
    >
      <Bell className="size-4" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          data-slot="notification-bell-count"
          className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-4 font-semibold tabular-nums"
        >
          {display}
        </span>
      ) : null}
    </Link>
  )
}
