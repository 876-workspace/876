import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { WorkStructureSettings } from '@/features/projects/components/work-structure-settings'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export const metadata = { title: 'Workflow states' }

export default async function WorkflowStatesPage() {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const result = await projects.workflowStates.list(orgId)
  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <h1 className="876-page-title mb-6">Workflow states</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Define the stages work moves through.
      </p>
      <WorkStructureSettings
        kind="workflow-states"
        items={result.data?.data ?? []}
        initialError={result.error}
      />
    </div>
  )
}
