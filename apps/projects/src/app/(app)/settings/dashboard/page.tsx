import { AppError } from '@876/ui/app-error'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

import { DashboardWidgetsManager } from './_components/dashboard-widgets-manager'

export const metadata = { title: 'Dashboard' }

export default async function DashboardSettingsPage() {
  await requireAppPermission('settings.edit')
  const { orgId, userId } = await requireProjectsContext()
  const [modules, widgets] = await Promise.all([
    projects.customModules.listModules(orgId),
    projects.customModules.listWidgets(orgId, {}),
  ])

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Add, remove, and reorder the custom-module widgets shown on the home dashboard.
      </p>
      {modules.error ?? widgets.error ? (
        <div className="mb-4">
          <AppError
            title="Dashboard settings could not be loaded"
            error={(modules.error ?? widgets.error) as NonNullable<typeof modules.error>}
            variant="banner"
          />
        </div>
      ) : null}
      <DashboardWidgetsManager
        modules={modules.data?.data ?? []}
        initial={widgets.data?.data ?? []}
        userId={userId}
      />
    </div>
  )
}
