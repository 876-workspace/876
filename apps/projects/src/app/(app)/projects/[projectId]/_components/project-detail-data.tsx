import { ProjectDetail } from '@876/projects-ui/project-detail'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

export async function ProjectDetailData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const [projectResult, issuesResult, membersResult] = await Promise.all([
    projects.projects.retrieve(orgId, projectId),
    projects.issues.list(orgId, { project: projectId, limit: 100 }),
    loadMemberLabels(orgId),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()
  if (projectResult.error || !projectResult.data)
    return (
      <AppError
        title="The project could not be loaded"
        error={
          projectResult.error ?? {
            code: 'projects/project-unavailable',
            message: 'The project could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const enrichmentError = issuesResult.error ?? membersResult.error

  return (
    <div className="space-y-4">
      {enrichmentError ? (
        <AppError
          title="Some project details could not be loaded"
          error={enrichmentError}
          variant="banner"
        />
      ) : null}
      <ProjectDetail
        project={projectResult.data}
        issues={issuesResult.data?.data ?? []}
        issueTotal={issuesResult.data?.total_count ?? null}
        issuesHasMore={issuesResult.data?.has_more ?? false}
        leadLabel={
          projectResult.data.leadUserId
            ? membersResult.labels[projectResult.data.leadUserId] ?? null
            : null
        }
        issuesHref="/issues"
      />
    </div>
  )
}
