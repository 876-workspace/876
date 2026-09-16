import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { LayoutForm } from '@/features/projects/components/layout-form'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { availableLayoutFields } from '@/lib/layout-available-fields'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Edit layout' }

type Props = { params: Promise<{ layoutId: string }> }

export default async function EditLayoutPage({ params }: Props) {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const { layoutId } = await params
  const decodedId = decodeURIComponent(layoutId)

  const [layout, projectFields, phaseFields, workItemFields, types] =
    await Promise.all([
      projects.layouts.retrieve(orgId, decodedId),
      projects.projectCustomFields.list(orgId),
      projects.milestones.customFields.list(orgId),
      projects.customFields.list(orgId),
      projects.workItemTypes.list(orgId),
    ])

  if (layout.error?.code === 'projects/layout-not-found') notFound()
  if (layout.error || !layout.data)
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb href="/settings/layouts" label="Layouts" className="mb-4" />
        <AppError
          title="The layout could not be loaded"
          error={
            layout.error ?? {
              code: 'projects/layout-unavailable',
              message: 'The layout could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )

  const loadError =
    projectFields.error ?? phaseFields.error ?? workItemFields.error ?? types.error

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings/layouts" label="Layouts" className="mb-4" />
      <h1 className="876-page-title mb-6">Edit layout</h1>
      {loadError ? (
        <div className="mb-4">
          <AppError title="Some layout options could not be loaded" error={loadError} variant="banner" />
        </div>
      ) : null}
      <LayoutForm
        mode="edit"
        layout={layout.data}
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
