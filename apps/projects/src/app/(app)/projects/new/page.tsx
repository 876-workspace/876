import { AppError } from '@876/ui/app-error'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { NewProjectForm } from '@/features/projects/components/new-project-form'
import { requireAppAccess, requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata: Metadata = { title: 'New project' }

export default async function NewProjectPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.create' })
  const { orgId } = await requireProjectsContext()
  const [layoutResult, fieldResult] = await Promise.all([
    projects.layouts.resolve(orgId, { entity: 'project' }),
    projects.projectCustomFields.list(orgId),
  ])
  const loadError = layoutResult.error ?? fieldResult.error

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ResourceToolbar title="New project" />
      {loadError ? (
        <div className="mb-4">
          <AppError
            title="Some project form data could not be loaded"
            error={loadError}
            variant="banner"
          />
        </div>
      ) : null}
      <NewProjectForm
        layout={layoutResult.data ?? null}
        customFields={fieldResult.data?.data ?? []}
      />
    </div>
  )
}
