import { AppError } from '@876/ui/app-error'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ProjectCustomFieldSettings } from '@/features/projects/components/project-custom-field-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Project fields' }

export default async function ProjectFieldsPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const fields = await projects.projectCustomFields.list(orgId)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-2">Project fields</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Define typed custom fields that apply to Projects without changing work-item fields.
      </p>
      {fields.error ? (
        <div className="mb-4">
          <AppError title="Project fields could not be loaded" error={fields.error} variant="banner" />
        </div>
      ) : null}
      <ProjectCustomFieldSettings fields={fields.data?.data ?? []} />
    </div>
  )
}
