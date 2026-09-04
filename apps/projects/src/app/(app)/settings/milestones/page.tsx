import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WorkStructureSettings } from '@/features/projects/components/work-structure-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import { listProjectMilestones } from '@/lib/work-structure-data'

export const metadata = { title: 'Milestones' }

export default async function MilestonesPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const projectResult = await projects.projects.list(orgId, { limit: 100 })
  const projectItems = projectResult.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-6">Milestones</h1>
      <WorkStructureSettings
        kind="milestones"
        items={milestoneResults.flatMap((result) => result.data?.data ?? [])}
        projects={projectItems}
      />
    </div>
  )
}
