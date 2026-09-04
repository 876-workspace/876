import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WorkStructureSettings } from '@/features/projects/components/work-structure-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Custom fields' }

export default async function CustomFieldsPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const [fields, types] = await Promise.all([
    projects.customFields.list(orgId),
    projects.workItemTypes.list(orgId),
  ])
  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-6">Custom fields</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Capture the details that matter to your workspace.
      </p>
      <WorkStructureSettings
        kind="custom-fields"
        items={fields.data?.data ?? []}
        workItemTypes={types.data?.data ?? []}
        initialError={fields.error ?? types.error}
      />
    </div>
  )
}
