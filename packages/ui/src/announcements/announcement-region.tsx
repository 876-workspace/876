'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

import { AnnouncementBar } from './announcement-bar'
import {
  dismissAnnouncement,
  getDismissedServerSnapshot,
  getDismissedSnapshot,
  subscribeToDismissed,
} from './dismissed-store'
import { useAppUpdate } from './use-app-update'
import { useConnectivity } from './use-connectivity'
import {
  ANNOUNCEMENT_PRIORITY,
  type Announcement,
  type AnnouncementActionKey,
} from './types'

export const OFFLINE_ANNOUNCEMENT_ID = 'connectivity/offline'
export const UPDATE_ANNOUNCEMENT_ID = 'app/update-available'

export interface AnnouncementRegionProps {
  /**
   * Announcements resolved elsewhere — today an app may pass none. This is the
   * seam a console-managed feed plugs into: the server resolves the viewer's
   * announcements and passes plain data down.
   */
  announcements?: Announcement[]
  /** Set to false where an app has no service worker. */
  watchUpdates?: boolean
  /** Set to false to opt out of the offline bar (tests, embedded surfaces). */
  watchConnectivity?: boolean
  className?: string
}

/**
 * The app-wide announcement strip.
 *
 * Mounted once per app, in the shell directly under the topbar, so a message
 * appears **above** the page without replacing it. This is the whole point:
 * losing connectivity used to swap the entire screen for an offline document,
 * which threw away whatever the user was looking at and could not be undone
 * without a reload. A bar states the condition, keeps the app usable, and
 * disappears by itself when the condition clears.
 */
export function AnnouncementRegion({
  announcements = [],
  watchUpdates = true,
  watchConnectivity = true,
  className,
}: AnnouncementRegionProps) {
  const online = useConnectivity()
  const { updateAvailable, apply } = useAppUpdate()
  const dismissed = useSyncExternalStore(
    subscribeToDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot
  )

  const runtime = useMemo<Announcement[]>(() => {
    const items: Announcement[] = []

    if (watchConnectivity && !online)
      items.push({
        id: OFFLINE_ANNOUNCEMENT_ID,
        tone: 'warning',
        title: 'You are offline.',
        message:
          'Changes you make may not be saved until the connection returns.',
        priority: ANNOUNCEMENT_PRIORITY.offline,
        // Not dismissible: it clears when connectivity returns, not when it is
        // waved away, so a dismissed bar could not tell the truth.
        dismissible: false,
      })

    if (watchUpdates && updateAvailable)
      items.push({
        id: UPDATE_ANNOUNCEMENT_ID,
        tone: 'info',
        title: 'A new version is available.',
        message: 'Refresh to get the latest.',
        actions: [{ label: 'Refresh', action: 'apply-update' }],
        priority: ANNOUNCEMENT_PRIORITY.update,
        dismissible: true,
      })

    return items
  }, [online, updateAvailable, watchConnectivity, watchUpdates])

  const visible = useMemo(() => {
    const all = [...runtime, ...announcements]
    const seen = new Set<string>()

    return all
      .filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return !(item.dismissible !== false && dismissed.includes(item.id))
      })
      .sort(
        (a, b) =>
          (b.priority ?? ANNOUNCEMENT_PRIORITY.editorial) -
          (a.priority ?? ANNOUNCEMENT_PRIORITY.editorial)
      )
  }, [announcements, dismissed, runtime])

  const dismiss = useCallback((id: string) => {
    dismissAnnouncement(id)
  }, [])

  const runAction = useCallback(
    (id: string, key: AnnouncementActionKey) => {
      if (key === 'apply-update') {
        apply()
        return
      }
      if (key === 'reload') {
        window.location.reload()
        return
      }
      dismiss(id)
    },
    [apply, dismiss]
  )

  if (visible.length === 0) return null

  return (
    <div className={className}>
      {visible.map((announcement) => (
        <AnnouncementBar
          key={announcement.id}
          announcement={announcement}
          onAction={(key) => runAction(announcement.id, key)}
          onDismiss={() => dismiss(announcement.id)}
        />
      ))}
    </div>
  )
}
