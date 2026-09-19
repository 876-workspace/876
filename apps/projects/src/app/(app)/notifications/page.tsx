import { AppError } from '@876/ui/app-error'

import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { serviceNotificationToUi } from '@/lib/notification-mappers'
import { projects } from '@/lib/clients/projects'

import { NotificationsManager } from './_components/notifications-manager'

export const metadata = { title: 'Notifications' }

const SUBJECT_HREFS: Record<string, string> = {
  'work-item': '/issues',
  phase: '/phases',
  project: '/projects',
  event: '/calendar/events',
}

export default async function NotificationsPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  const { orgId, userId } = await requireProjectsContext()
  const result = await projects.notifications.list(orgId, userId)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <h1 className="876-page-title mb-2">Notifications</h1>
      {result.error ? (
        <AppError
          title="Notifications could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : (
        <NotificationsManager
          initial={(result.data?.data ?? []).map(serviceNotificationToUi)}
          hrefFor={SUBJECT_HREFS}
        />
      )}
    </div>
  )
}
