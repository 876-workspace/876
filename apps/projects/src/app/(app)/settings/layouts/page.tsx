import { AppError } from '@876/ui/app-error'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { LayoutsSettings } from '@/features/projects/components/layouts-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Layouts' }

export default async function LayoutsPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const [layouts, types] = await Promise.all([
    projects.layouts.list(orgId),
    projects.workItemTypes.list(orgId),
  ])

  const typeNames: Record<string, string> = {}
  for (const type of types.data?.data ?? []) typeNames[type.id] = type.name

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Layouts</h1>
      {layouts.error ?? types.error ? (
        <div className="mb-4">
          <AppError
            title="Layouts could not be loaded"
            error={(layouts.error ?? types.error) as NonNullable<typeof layouts.error>}
            variant="banner"
          />
        </div>
      ) : null}
      <LayoutsSettings
        layouts={layouts.data?.data ?? []}
        typeNames={typeNames}
      />
    </div>
  )
}
