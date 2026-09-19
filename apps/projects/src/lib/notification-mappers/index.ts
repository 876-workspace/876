import type { ProjectNotification as UiProjectNotification } from '@876/projects-ui/automation/types'

import type { ServiceNotification } from '@/types/notifications'

export function serviceNotificationToUi(
  notification: ServiceNotification
): UiProjectNotification {
  return {
    object: 'projects.notification',
    id: notification.id,
    subjectType: notification.subjectType ?? 'work-item',
    subjectId: notification.subjectId ?? notification.id,
    title: notification.title,
    body: null,
    read: notification.readAt !== null,
    createdAt: notification.createdAt,
  }
}

export function countUnread(
  notifications: readonly ServiceNotification[]
): number {
  return notifications.filter((notification) => notification.readAt === null)
    .length
}
