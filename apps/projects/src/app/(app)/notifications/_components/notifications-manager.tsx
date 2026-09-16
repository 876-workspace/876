'use client'

import { NotificationList } from '@876/projects-ui/automation/notification-list'
import type { ProjectNotification } from '@876/projects-ui/automation/types'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useState } from 'react'

import { notificationsClient } from '@/lib/client'

type Props = {
  initial: readonly ProjectNotification[]
  hrefFor: Record<string, string>
}

export function NotificationsManager({ initial, hrefFor }: Props) {
  const [notifications, setNotifications] =
    useState<readonly ProjectNotification[]>(initial)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const unread = notifications.filter(
    (notification) => !notification.read
  )

  async function markRead(id: string) {
    if (pendingId) return
    setPendingId(id)
    setError(null)
    const result = await notificationsClient.markRead(id)
    setPendingId(null)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/notification-update-failed',
        message:
          result.error?.message ?? 'The notification could not be updated.',
      })
      return
    }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  async function markAllRead() {
    if (pendingId) return
    for (const notification of unread) {
      await markRead(notification.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <AppError
          title="Notification not updated"
          error={error}
          variant="banner"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-muted-foreground text-sm">
          {unread.length === 0
            ? 'All caught up'
            : `${unread.length} unread notification${unread.length === 1 ? '' : 's'}`}
        </p>
        {unread.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingId !== null}
            onClick={() => void markAllRead()}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>
      <NotificationList notifications={notifications} hrefFor={hrefFor} />
      {unread.length > 0 ? (
        <section aria-label="Mark notifications read" className="flex flex-col gap-2">
          {unread.map((notification) => (
            <div
              key={notification.id}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                {notification.title}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingId === notification.id}
                onClick={() => void markRead(notification.id)}
              >
                Mark &ldquo;{notification.title}&rdquo; as read
              </Button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
