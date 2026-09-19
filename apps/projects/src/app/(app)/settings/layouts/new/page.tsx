import type { Layout } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { LayoutForm } from '@/features/projects/components/layout-form'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { availableLayoutFields } from '@/lib/layout-available-fields'
import { projects } from '@/lib/clients/projects'

export const metadata = { title: 'New layout' }

const BLANK_LAYOUT: Layout = {
  object: 'projects.layout',
  id: null,
  entity: 'project',
  workItemTypeId: null,
  name: '',
  version: 1,
  isDefault: false,
  builtIn: false,
  sections: [
    {
      key: 'section-1',
      title: 'Details',
      columns: 1,
      fields: [
        { fieldKey: 'title', width: 1, visible: true },
        { fieldKey: 'description', width: 1, visible: true },
      ],
    },
  ],
  rules: [],
}

export default async function NewLayoutPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const [projectFields, phaseFields, workItemFields, types] = await Promise.all([
    projects.projectCustomFields.list(orgId),
    projects.milestones.customFields.list(orgId),
    projects.customFields.list(orgId),
    projects.workItemTypes.list(orgId),
  ])

  const loadError =
    projectFields.error ?? phaseFields.error ?? workItemFields.error ?? types.error

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings/layouts" label="Layouts" className="mb-4" />
      <h1 className="876-page-title mb-6">New layout</h1>
      {loadError ? (
        <div className="mb-4">
          <AppError title="Some layout options could not be loaded" error={loadError} variant="banner" />
        </div>
      ) : null}
      <LayoutForm
        mode="create"
        layout={BLANK_LAYOUT}
        workItemTypes={types.data?.data ?? []}
        availableByEntity={availableLayoutFields({
          projectFields: projectFields.data?.data ?? [],
          phaseFields: phaseFields.data?.data ?? [],
          workItemFields: workItemFields.data?.data ?? [],
        })}
      />
    </div>
  )
}
