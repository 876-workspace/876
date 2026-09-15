import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import { listProjectMilestones } from '@/lib/work-structure-data'

import { EditIssueForm } from './new-issue-form'

export async function EditIssueData({ issueRef }: { issueRef: string }) {
  const { orgId } = await requireProjectsContext()
  const decodedIssueRef = decodeURIComponent(issueRef)
  const [issueResult, types, states, projectList, fields, labels, issueList, members] =
    await Promise.all([
      projects.issues.retrieve(orgId, decodedIssueRef),
      projects.workItemTypes.list(orgId),
      projects.workflowStates.list(orgId),
      projects.projects.list(orgId, { limit: 100 }),
      projects.customFields.list(orgId),
      projects.labels.list(orgId),
      projects.issues.list(orgId, { limit: 100, order: 'updated' }),
      loadMemberLabels(orgId),
    ])

  if (issueResult.error?.code === 'projects/issue-not-found') notFound()
  if (issueResult.error || !issueResult.data)
    return (
      <AppError
        title="The issue could not be loaded"
        error={
          issueResult.error ?? {
            code: 'projects/issue-unavailable',
            message: 'The issue could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const projectItems = projectList.data?.data ?? []
  const milestoneResults = await listProjectMilestones(orgId, projectItems)
  const loadError = [
    types.error,
    states.error,
    projectList.error,
    fields.error,
    labels.error,
    issueList.error,
    members.error,
    ...milestoneResults.map((result) => result.error),
  ].find(Boolean)

  if (loadError)
    return (
      <AppError
        title="Issue editing options could not be loaded"
        error={loadError}
        variant="banner"
      />
    )

  const memberOptions = Object.entries(members.labels).map(([userId, label]) => ({
    userId,
    label,
  }))
  if (
    issueResult.data.assigneeUserId &&
    !members.labels[issueResult.data.assigneeUserId]
  )
    memberOptions.push({
      userId: issueResult.data.assigneeUserId,
      label: issueResult.data.assigneeUserId,
    })

  return (
    <EditIssueForm
      issue={issueResult.data}
      workItemTypes={types.data?.data ?? []}
      workflowStates={states.data?.data ?? []}
      projects={projectItems}
      milestones={milestoneResults.flatMap((result) => result.data?.data ?? [])}
      customFields={fields.data?.data ?? []}
      labels={labels.data?.data ?? []}
      issues={issueList.data?.data ?? []}
      members={memberOptions}
    />
  )
}
