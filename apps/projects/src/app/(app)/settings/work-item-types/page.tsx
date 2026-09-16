import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WorkStructureSettings } from '@/features/projects/components/work-structure-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export const metadata = { title: 'Work item types' }

export default async function WorkItemTypesPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const result = await projects.workItemTypes.list(orgId)
  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-6">Work item types</h1>
      <WorkStructureSettings
        kind="work-item-types"
        items={result.data?.data ?? []}
        initialError={result.error}
      />
    </div>
  )
}
