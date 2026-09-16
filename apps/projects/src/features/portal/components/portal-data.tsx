import { AppError } from '@876/ui/app-error'
import Link from 'next/link'

import type { PortalAccess } from '@/lib/portal-access'
import { getPortalClient } from '@/lib/services/portal'

import { PortalReplyForm } from './portal-reply-form'

function portalBase(projectId: string): string {
  return `/portal/${encodeURIComponent(projectId)}`
}

function fail(title: string, message: string) {
  return (
    <AppError
      title={title}
      error={{ code: 'portal/unavailable', message }}
      variant="banner"
    />
  )
}

export async function PortalOverviewData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const [milestones, activity, issues, files] = await Promise.all([
    portal.listMilestones(access.orgId, projectId, { limit: 5 }),
    portal.listActivity(access.orgId, projectId, { limit: 10 }),
    portal.listIssues(access.orgId, projectId, { limit: 5 }),
    portal.listAttachments(access.orgId, projectId, { limit: 5 }),
  ])
  if (milestones.error || activity.error || issues.error || files.error)
    return fail('Overview could not be loaded', 'The portal data was unavailable.')

  return (
    <div className="space-y-6">
      <section aria-label="Latest work" className="space-y-2">
        <h2 className="text-sm font-semibold">Latest work</h2>
        {(issues.data?.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No shared work yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(issues.data?.data ?? []).map((issue) => (
              <li key={issue.id} className="rounded-md border px-4 py-3">
                <Link
                  href={`${portalBase(projectId)}/work/${encodeURIComponent(issue.identifier)}`}
                  className="text-sm font-medium hover:underline"
                >
                  {issue.title}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {issue.identifier} · {issue.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Phases" className="space-y-2">
        <h2 className="text-sm font-semibold">Phases</h2>
        {(milestones.data?.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No shared phases yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(milestones.data?.data ?? []).map((milestone) => (
              <li key={milestone.id} className="rounded-md border px-4 py-3">
                <Link
                  href={`${portalBase(projectId)}/phases/${encodeURIComponent(milestone.id)}`}
                  className="text-sm font-medium hover:underline"
                >
                  {milestone.name}
                </Link>
                <p className="text-muted-foreground text-xs">{milestone.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Recent activity" className="space-y-2">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        {(activity.data?.items ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(activity.data?.items ?? []).map((item) => (
              <li key={item.id} className="rounded-md border px-4 py-3">
                <p className="text-sm font-medium">{item.subjectId}</p>
                <p className="text-muted-foreground text-xs">
                  {item.kind} · {item.type}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export async function PortalPhasesData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.listMilestones(access.orgId, projectId, {
    limit: 100,
  })
  if (result.error || !result.data)
    return fail('Phases could not be loaded', 'The portal data was unavailable.')
  if (result.data.data.length === 0)
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No shared phases yet
      </p>
    )
  return (
    <ul data-slot="portal-phases" className="flex flex-col gap-2">
      {result.data.data.map((milestone) => (
        <li key={milestone.id} className="rounded-md border px-4 py-3">
          <Link
            href={`${portalBase(projectId)}/phases/${encodeURIComponent(milestone.id)}`}
            className="text-sm font-medium hover:underline"
          >
            {milestone.name}
          </Link>
          {milestone.description ? (
            <p className="text-muted-foreground mt-1 text-sm">{milestone.description}</p>
          ) : null}
          <p className="text-muted-foreground mt-1 text-xs">{milestone.status}</p>
        </li>
      ))}
    </ul>
  )
}

export async function PortalPhaseDetailData({
  access,
  projectId,
  phaseId,
}: {
  access: PortalAccess
  projectId: string
  phaseId: string
}) {
  const portal = getPortalClient(access.userId)
  const [milestone, comments] = await Promise.all([
    portal.retrieveMilestone(access.orgId, projectId, phaseId),
    portal.listMilestoneComments(access.orgId, projectId, phaseId),
  ])
  if (milestone.error || !milestone.data)
    return fail('Phase could not be loaded', 'The portal data was unavailable.')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{milestone.data.name}</h1>
        {milestone.data.description ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {milestone.data.description}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-1 text-xs">{milestone.data.status}</p>
      </div>
      <section aria-label="Phase comments" className="space-y-2">
        <h2 className="text-sm font-semibold">Comments</h2>
        {(comments.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(comments.data ?? []).map((comment) => (
              <li key={comment.id} className="rounded-md border px-4 py-3">
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PortalReplyForm
        endpoint={`/api/portal/${encodeURIComponent(projectId)}/phases/${encodeURIComponent(milestone.data.id)}/comments`}
        label="Comment on this phase"
      />
    </div>
  )
}

export async function PortalWorkData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.listIssues(access.orgId, projectId, { limit: 100 })
  if (result.error || !result.data)
    return fail('Work could not be loaded', 'The portal data was unavailable.')
  if (result.data.data.length === 0)
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No shared work yet
      </p>
    )
  return (
    <ul data-slot="portal-work" className="flex flex-col gap-2">
      {result.data.data.map((issue) => (
        <li key={issue.id} className="rounded-md border px-4 py-3">
          <Link
            href={`${portalBase(projectId)}/work/${encodeURIComponent(issue.identifier)}`}
            className="text-sm font-medium hover:underline"
          >
            {issue.title}
          </Link>
          <p className="text-muted-foreground mt-1 text-xs">
            {issue.identifier} · {issue.status} · {issue.priority}
          </p>
        </li>
      ))}
    </ul>
  )
}

export async function PortalWorkDetailData({
  access,
  projectId,
  issueRef,
}: {
  access: PortalAccess
  projectId: string
  issueRef: string
}) {
  const portal = getPortalClient(access.userId)
  const [issue, comments] = await Promise.all([
    portal.retrieveIssue(access.orgId, projectId, issueRef),
    portal.listIssueComments(access.orgId, projectId, issueRef),
  ])
  if (issue.error || !issue.data)
    return fail('Work item could not be loaded', 'The portal data was unavailable.')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{issue.data.title}</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          {issue.data.identifier} · {issue.data.status} · {issue.data.priority}
        </p>
        {issue.data.description ? (
          <p className="mt-2 text-sm whitespace-pre-wrap">{issue.data.description}</p>
        ) : null}
      </div>
      <section aria-label="Work comments" className="space-y-2">
        <h2 className="text-sm font-semibold">Comments</h2>
        {(comments.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(comments.data ?? []).map((comment) => (
              <li key={comment.id} className="rounded-md border px-4 py-3">
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PortalReplyForm
        endpoint={`/api/portal/${encodeURIComponent(projectId)}/work/${encodeURIComponent(issue.data.identifier)}/comments`}
        label="Comment on this work item"
      />
    </div>
  )
}

export async function PortalFilesData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.listAttachments(access.orgId, projectId, {
    limit: 100,
  })
  if (result.error || !result.data)
    return fail('Files could not be loaded', 'The portal data was unavailable.')
  if (result.data.data.length === 0)
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No shared files yet
      </p>
    )
  return (
    <ul data-slot="portal-files" className="flex flex-col gap-2">
      {result.data.data.map((file) => (
        <li key={file.id} className="rounded-md border px-4 py-3">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium hover:underline"
          >
            {file.name ?? file.url}
          </a>
        </li>
      ))}
    </ul>
  )
}

export async function PortalDiscussionsData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.listDiscussions(access.orgId, projectId, {
    limit: 100,
  })
  if (result.error || !result.data)
    return fail('Discussions could not be loaded', 'The portal data was unavailable.')
  if (result.data.data.length === 0)
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No shared discussions yet
      </p>
    )
  return (
    <ul data-slot="portal-discussions" className="flex flex-col gap-2">
      {result.data.data
        .slice()
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return 0
        })
        .map((discussion) => (
          <li key={discussion.id} className="rounded-md border px-4 py-3">
            <Link
              href={`${portalBase(projectId)}/discussions/${encodeURIComponent(discussion.id)}`}
              className="text-sm font-medium hover:underline"
            >
              {discussion.title}
            </Link>
            {discussion.pinned ? (
              <span className="text-muted-foreground ml-2 text-xs">Pinned</span>
            ) : null}
          </li>
        ))}
    </ul>
  )
}

export async function PortalDiscussionDetailData({
  access,
  projectId,
  discussionId,
}: {
  access: PortalAccess
  projectId: string
  discussionId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.retrieveDiscussion(
    access.orgId,
    projectId,
    discussionId
  )
  if (result.error || !result.data)
    return fail('Discussion could not be loaded', 'The portal data was unavailable.')
  const { discussion, posts } = result.data
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{discussion.title}</h1>
        <p className="mt-2 text-sm whitespace-pre-wrap">{discussion.body}</p>
      </div>
      <section aria-label="Discussion replies" className="space-y-2">
        <h2 className="text-sm font-semibold">Replies</h2>
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No replies yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((post) => (
              <li key={post.id} className="rounded-md border px-4 py-3">
                <p className="text-sm whitespace-pre-wrap">{post.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <PortalReplyForm
        endpoint={`/api/portal/${encodeURIComponent(projectId)}/discussions/${encodeURIComponent(discussion.id)}/posts`}
        label="Reply to this discussion"
      />
    </div>
  )
}

export async function PortalTimeData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.getTimeByPhase(access.orgId, projectId)
  if (result.error || !result.data)
    return fail('Time could not be loaded', 'The portal data was unavailable.')
  if (result.data.length === 0)
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No time recorded yet
      </p>
    )
  const total = result.data.reduce((sum, row) => sum + row.hours, 0)
  return (
    <div className="space-y-4">
      <p className="text-sm">
        Total <span className="font-semibold">{total.toFixed(1)} hours</span>
      </p>
      <ul data-slot="portal-time" className="flex flex-col gap-2">
        {result.data.map((row) => (
          <li
            key={row.milestoneId ?? 'unassigned'}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
          >
            <span className="text-sm font-medium">
              {row.milestoneName ?? 'Unassigned'}
            </span>
            <span className="text-sm">{row.hours.toFixed(1)} hours</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function PortalInvoicesData({
  access,
  projectId,
}: {
  access: PortalAccess
  projectId: string
}) {
  const portal = getPortalClient(access.userId)
  const result = await portal.listInvoices(access.orgId, projectId)
  if (result.error || !result.data)
    return fail('Invoices could not be loaded', 'The portal data was unavailable.')
  if (result.data.length === 0)
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No invoices yet
      </p>
    )
  return (
    <ul data-slot="portal-invoices" className="flex flex-col gap-2">
      {result.data.map((invoice) => (
        <li
          key={invoice.invoiceId}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
        >
          <span className="text-sm font-medium">{invoice.invoiceId}</span>
          <span className="text-muted-foreground text-xs">
            {invoice.status} · {invoice.billedHours.toFixed(1)} hours ·{' '}
            {invoice.entryCount} {invoice.entryCount === 1 ? 'entry' : 'entries'}
          </span>
        </li>
      ))}
    </ul>
  )
}
