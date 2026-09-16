import { AppError } from '@876/ui/app-error'

import {
  IssueLinksPanel,
  type DependencyLink,
  type RelationLink,
  type WorkItemOption,
} from '@/features/projects/components/issue-links-panel'
import { projects } from '@/lib/services/projects'

function unavailableWorkItem(issueId: string): WorkItemOption {
  return { id: issueId, identifier: issueId, title: 'Work item unavailable' }
}

/**
 * Resolves the work item at the other end of every link.
 *
 * A link row stores only ids, so each end is read back by id. A read that fails
 * (a soft-deleted target, a stale link) still yields a row: the link is real
 * even when its other end no longer is.
 */
async function loadWorkItemOptions(
  orgId: string,
  issueIds: readonly string[]
): Promise<Map<string, WorkItemOption>> {
  const entries = await Promise.all(
    issueIds.map(async (issueId) => {
      const result = await projects.issues.retrieve(orgId, issueId)
      const option: WorkItemOption = result.data
        ? {
            id: result.data.id,
            identifier: result.data.identifier,
            title: result.data.title,
          }
        : unavailableWorkItem(issueId)
      return [issueId, option] as const
    })
  )
  return new Map(entries)
}

/**
 * The server half of the relationships and dependencies panel. It sits in its
 * own Suspense boundary so the work item renders without waiting on link
 * reads, then hands resolved link rows to the client component that owns the
 * add/edit/remove controls.
 */
export async function IssueLinksData({
  orgId,
  issueRef,
}: {
  orgId: string
  issueRef: string
}) {
  const [issueResult, relationsResult, dependenciesResult] = await Promise.all([
    projects.issues.retrieve(orgId, issueRef),
    projects.issueRelations.list(orgId, issueRef),
    projects.issueDependencies.list(orgId, issueRef),
  ])

  const error =
    issueResult.error ?? relationsResult.error ?? dependenciesResult.error
  if (error || !issueResult.data)
    return (
      <AppError
        title="Work item links could not be loaded"
        error={
          error ?? {
            code: 'projects/issue-unavailable',
            message: 'The work item could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const issue = issueResult.data
  const relations = relationsResult.data?.data ?? []
  const predecessors = dependenciesResult.data?.predecessors ?? []
  const successors = dependenciesResult.data?.successors ?? []

  const linkedIds = new Set<string>()
  for (const relation of relations)
    linkedIds.add(
      relation.sourceIssueId === issue.id
        ? relation.targetIssueId
        : relation.sourceIssueId
    )
  for (const dependency of [...predecessors, ...successors])
    linkedIds.add(
      dependency.predecessorIssueId === issue.id
        ? dependency.successorIssueId
        : dependency.predecessorIssueId
    )

  const items = await loadWorkItemOptions(orgId, [...linkedIds])
  const item = (issueId: string): WorkItemOption =>
    items.get(issueId) ?? unavailableWorkItem(issueId)

  const relationLinks: RelationLink[] = relations.map((relation) => {
    const outgoing = relation.sourceIssueId === issue.id
    return {
      id: relation.id,
      type: relation.type,
      direction: outgoing ? 'outgoing' : 'incoming',
      item: item(outgoing ? relation.targetIssueId : relation.sourceIssueId),
    }
  })
  const dependencyLinks: DependencyLink[] = [
    ...predecessors.map((dependency) => ({
      id: dependency.id,
      role: 'predecessor' as const,
      type: dependency.type,
      lagMinutes: dependency.lagMinutes,
      item: item(dependency.predecessorIssueId),
    })),
    ...successors.map((dependency) => ({
      id: dependency.id,
      role: 'successor' as const,
      type: dependency.type,
      lagMinutes: dependency.lagMinutes,
      item: item(dependency.successorIssueId),
    })),
  ]

  return (
    <IssueLinksPanel
      issueRef={issue.identifier}
      issueId={issue.id}
      projectId={issue.projectId}
      relations={relationLinks}
      dependencies={dependencyLinks}
      plannedStartDate={issue.plannedStartDate}
      plannedFinishDate={issue.plannedFinishDate}
      plannedDurationMinutes={issue.plannedDurationMinutes}
    />
  )
}
