import { Badge } from '@876/ui/badge'
import Link from 'next/link'

import { formatDay } from '../finance/format-money'
import { avatarTone, MobileList, MobileListCell } from '../mobile-list'
import type { ProjectNotification } from './types'

export type NotificationListProps = {
  notifications: readonly ProjectNotification[]
  /** Maps a notification subject type to the base href its subject links to. */
  hrefFor: Record<string, string>
}

function subjectHref(
  hrefFor: Record<string, string>,
  subjectType: string,
  subjectId: string
): string | null {
  const base = hrefFor[subjectType]
  if (!base) return null
  return `${base.replace(/\/$/, '')}/${encodeURIComponent(subjectId)}`
}

function NotificationCell({
  notification,
  href,
}: {
  notification: ProjectNotification
  href: string | null
}) {
  return (
    <MobileListCell
      href={href ?? undefined}
      label={`View notification ${notification.title}`}
      avatar={notification.subjectType.slice(0, 2).toUpperCase()}
      avatarClassName={avatarTone(notification.subjectType)}
      title={notification.title}
      subtitle={notification.body ?? undefined}
      meta={formatDay(notification.createdAt)}
    />
  )
}

export function NotificationList({
  notifications,
  hrefFor,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <p
        data-slot="notification-list-empty"
        className="text-muted-foreground py-12 text-center text-sm"
      >
        No notifications yet
      </p>
    )
  }

  return (
    <>
      <MobileList>
        {notifications.map((notification) => (
          <NotificationCell
            key={notification.id}
            notification={notification}
            href={subjectHref(
              hrefFor,
              notification.subjectType,
              notification.subjectId
            )}
          />
        ))}
      </MobileList>
      <ul
        data-slot="notification-list"
        className="hidden flex-col gap-2 sm:flex"
      >
        {notifications.map((notification) => {
          const href = subjectHref(
            hrefFor,
            notification.subjectType,
            notification.subjectId
          )
          return (
            <li
              key={notification.id}
              data-slot="notification-list-item"
              data-read={notification.read ? 'true' : 'false'}
              className="rounded-md border px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {href ? (
                  <Link
                    href={href}
                    className={
                      notification.read
                        ? 'text-muted-foreground text-sm hover:underline'
                        : 'text-sm font-semibold hover:underline'
                    }
                  >
                    {notification.title}
                  </Link>
                ) : (
                  <span
                    className={
                      notification.read
                        ? 'text-muted-foreground text-sm'
                        : 'text-sm font-semibold'
                    }
                  >
                    {notification.title}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  {notification.read ? null : (
                    <Badge variant="info">Unread</Badge>
                  )}
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDay(notification.createdAt)}
                  </span>
                </span>
              </div>
              {notification.body ? (
                <p
                  className={
                    notification.read
                      ? 'text-muted-foreground mt-1 text-xs'
                      : 'mt-1 text-xs'
                  }
                >
                  {notification.body}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </>
  )
}
