import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'

import { NewProjectForm } from '@/features/projects/components/new-project-form'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'New project' }

export default async function NewProjectPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.create' })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ResourceToolbar title="New project" />
      <NewProjectForm />
    </div>
  )
}
