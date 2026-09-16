import { ProjectDetail } from '@876/projects-ui/project-detail'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { WorkBreakdownData } from '@/features/projects/components/work-breakdown-data'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

export async function ProjectDetailData({
  orgId,
  userId,
  projectId,
  canEdit,
}: {
  orgId: string
  userId: string
  projectId: string
  canEdit: boolean
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
      {canEdit ? (
        <nav
          aria-label="Project actions"
          className="flex flex-wrap items-center gap-2"
        >
          <Link
            href={`/projects/${encodeURIComponent(projectResult.data.id)}/save-as-template`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Save as template
          </Link>
          <Link
            href={`/projects/${encodeURIComponent(projectResult.data.id)}/clone`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Clone
          </Link>
        </nav>
      ) : null}
      <ProjectDetail
        project={projectResult.data}
        issues={issuesResult.data?.data ?? []}
        issueTotal={issuesResult.data?.total_count ?? null}
        issuesHasMore={issuesResult.data?.has_more ?? false}
        leadLabel={
          projectResult.data.leadUserId
            ? (membersResult.labels[projectResult.data.leadUserId] ?? null)
            : null
        }
        issuesHref="/issues"
      />
      <Suspense
        fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}
      >
        <WorkBreakdownData orgId={orgId} projectId={projectId} />
      </Suspense>
      <Suspense
        fallback={<div className="876-card h-64 animate-pulse" aria-hidden />}
      >
        <AttachmentsData
          orgId={orgId}
          userId={userId}
          projectId={projectResult.data.id}
          resourceType="project"
          resourceId={projectResult.data.id}
          canEdit={canEdit}
        />
      </Suspense>
    </div>
  )
}
