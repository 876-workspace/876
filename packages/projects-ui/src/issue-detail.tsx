import Link from 'next/link'
import type { CustomField, Issue, IssueEvent } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Clock, Pencil } from '@876/ui/icons'
import { Markdown } from '@876/ui/markdown'
import type { ReactNode } from 'react'

import { formatDateTime } from './format-date'
import { MobileList, MobileListCell } from './mobile-list'
import { IssuePriorityBadge } from './priority-badges'
import { IssueStatusBadge } from './status-badges'

export type IssueDetailHeaderProps = {
  issue: Issue
  editHref?: string
  actions?: ReactNode
}
export type IssueDetailBodyProps = {
  issue: Issue
  events?: readonly IssueEvent[]
  parentIssue?: Issue | null
  subIssues?: readonly Issue[]
  userLabels?: Readonly<Record<string, string>>
  issuesHref?: string
}
export type IssueMetaRailProps = {
  issue: Issue
  customFields?: readonly CustomField[]
  userLabels?: Readonly<Record<string, string>>
  projectHref?: string
}
export type IssueDetailProps = IssueDetailHeaderProps &
  IssueDetailBodyProps &
  IssueMetaRailProps

function formatEventType(type: string) {
  return type
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
function formatCustomFieldValue(value: Issue['customFields'][number]['value']) {
  if (value === null || value === '') return 'Not set'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not set'
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
}
function userLabel(
  userId: string | null,
  labels: Readonly<Record<string, string>>
) {
  return userId ? (labels[userId] ?? userId) : 'Not assigned'
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border/60 sm:876-card -mx-4 border-t px-4 py-5 sm:mx-0 sm:border-0 sm:p-6">
      <div className="text-muted-foreground mb-4 text-xs font-medium tracking-wide uppercase sm:hidden">
        {title}
      </div>
      <div className="[&_[data-slot=detail-card-section-title]]:hidden sm:[&_[data-slot=detail-card-section-title]]:block">
        <DetailCardSection title={title}>{children}</DetailCardSection>
      </div>
    </section>
  )
}

function Timeline({
  events,
  userLabels,
}: {
  events: readonly IssueEvent[]
  userLabels: Readonly<Record<string, string>>
}) {
  return (
    <ol
      aria-label="Activity timeline"
      className="border-border/70 space-y-0 border-l"
    >
      {events.map((event) => (
        <li
          key={event.id}
          className="relative grid gap-1 pb-5 pl-5 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <span className="bg-primary border-background absolute top-1.5 -left-1.5 size-3 rounded-full border-2" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-foreground text-xs font-medium">
              {event.actorUserId
                ? (userLabels[event.actorUserId] ?? event.actorUserId)
                : 'System'}
            </span>
            <span className="text-muted-foreground">
              {formatEventType(event.type)}
            </span>
            {event.fromValue || event.toValue ? (
              <span className="text-muted-foreground">
                {event.fromValue ?? '—'} &rarr; {event.toValue ?? '—'}
              </span>
            ) : null}
          </div>
          <time className="text-muted-foreground text-xs sm:text-right">
            {formatDateTime(event.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  )
}

export function IssueDetailHeader({
  issue,
  editHref,
  actions,
}: IssueDetailHeaderProps) {
  return (
    <header className="border-border/60 sm:876-card -mx-4 border-y px-4 py-5 sm:mx-0 sm:border sm:p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-info font-mono text-xs font-semibold tracking-wide">
            {issue.projectKey} · {issue.identifier}
          </span>
          <span className="hidden items-center gap-2 sm:flex">
            <IssueStatusBadge status={issue.status} />
            <IssuePriorityBadge priority={issue.priority} />
            {issue.blocked ? (
              <Badge variant="destructive">Blocked</Badge>
            ) : null}
          </span>
        </div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {issue.title}
        </h1>
        {actions || editHref ? (
          <div className="border-border/60 bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {actions}
            {editHref ? (
              <Link
                href={editHref}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export function IssueDetailBody({
  issue,
  events = [],
  parentIssue = null,
  subIssues = [],
  userLabels = {},
  issuesHref,
}: IssueDetailBodyProps) {
  return (
    <div className="space-y-6">
      <Section title="Description">
        {issue.description ? (
          <Markdown
            content={issue.description}
            className="-mx-4 px-4 text-[0.9375rem] leading-7 sm:mx-0 sm:max-w-3xl sm:px-0"
          />
        ) : (
          <p className="text-muted-foreground text-sm italic">
            No description has been added to this issue.
          </p>
        )}
      </Section>
      <Section title="Work structure">
        <DetailCardFacts className="grid-cols-1 gap-y-5 sm:grid-cols-2">
          <DetailCardFact
            label="Type"
            value={issue.type?.name ?? issue.typeKey}
          />
          <DetailCardFact
            label="Workflow state"
            value={issue.state?.name ?? issue.status}
          />
          <DetailCardFact
            label="Phase"
            value={issue.milestone?.name ?? 'No phase'}
          />
          <DetailCardFact
            label="Parent"
            mono={Boolean(issue.parentIssueId && !parentIssue)}
            value={
              parentIssue && issuesHref ? (
                <Link
                  href={`${issuesHref}/${parentIssue.identifier}`}
                  className="text-sky-600 hover:underline dark:text-sky-400"
                >
                  <span className="font-mono text-xs">
                    {parentIssue.identifier}
                  </span>{' '}
                  — {parentIssue.title}
                </Link>
              ) : parentIssue ? (
                `${parentIssue.identifier} — ${parentIssue.title}`
              ) : (
                (issue.parentIssueId ?? 'No parent')
              )
            }
          />
        </DetailCardFacts>
      </Section>
      {subIssues.length || issue.subIssueCount ? (
        <Section title={`Sub-items (${issue.subIssueCount})`}>
          {subIssues.length ? (
            <>
              <div className="divide-border hidden divide-y sm:block">
                {subIssues.map((subIssue) => (
                  <div
                    key={subIssue.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      {issuesHref ? (
                        <Link
                          href={`${issuesHref}/${subIssue.identifier}`}
                          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {subIssue.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">
                          {subIssue.title}
                        </span>
                      )}
                      <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                        {subIssue.identifier}
                      </p>
                    </div>
                    <IssueStatusBadge status={subIssue.status} />
                  </div>
                ))}
              </div>
              <MobileList>
                {subIssues.map((subIssue) => (
                  <MobileListCell
                    key={subIssue.id}
                    href={
                      issuesHref
                        ? `${issuesHref}/${subIssue.identifier}`
                        : undefined
                    }
                    avatar={
                      <span className="font-mono text-xs">
                        {subIssue.identifier}
                      </span>
                    }
                    avatarClassName="bg-muted text-foreground"
                    title={subIssue.title}
                    subtitle={subIssue.identifier}
                    meta={<IssueStatusBadge status={subIssue.status} />}
                  />
                ))}
              </MobileList>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              {issue.subIssueCount} linked sub-item
              {issue.subIssueCount === 1 ? '' : 's'}.
            </p>
          )}
        </Section>
      ) : null}
      <Section title="Activity">
        {events.length ? (
          <>
            <div className="hidden sm:block">
              <Timeline events={events} userLabels={userLabels} />
            </div>
            <details className="sm:hidden">
              <summary className="text-foreground cursor-pointer text-sm font-medium">
                Show recent activity
              </summary>
              <div className="mt-4">
                <Timeline events={events.slice(0, 5)} userLabels={userLabels} />
              </div>
            </details>
          </>
        ) : (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Clock aria-hidden="true" className="size-4" />
            No activity yet.
          </div>
        )}
      </Section>
    </div>
  )
}

function MobileFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-border/60 grid grid-cols-2 gap-4 border-t py-3 first:border-t-0">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  )
}

export function IssueMetaRail({
  issue,
  customFields = [],
  userLabels = {},
  projectHref,
}: IssueMetaRailProps) {
  const fieldLabels = new Map(
    customFields.map((field) => [field.id, field.label])
  )
  const project = projectHref ? (
    <Link
      href={projectHref}
      className="font-mono text-xs text-sky-600 hover:underline dark:text-sky-400"
    >
      {issue.projectKey}
    </Link>
  ) : (
    issue.projectKey
  )
  const facts = (
    <>
      <DetailCardFact label="Project" mono value={project} />
      <DetailCardFact
        label="Assignee"
        value={userLabel(issue.assigneeUserId, userLabels)}
        mono={Boolean(
          issue.assigneeUserId && !userLabels[issue.assigneeUserId]
        )}
      />
      <DetailCardFact
        label="Creator"
        value={
          issue.creatorUserId
            ? (userLabels[issue.creatorUserId] ?? issue.creatorUserId)
            : 'Unknown creator'
        }
        mono={Boolean(issue.creatorUserId && !userLabels[issue.creatorUserId])}
      />
      <DetailCardFact label="Due date" value={formatDateTime(issue.dueDate)} />
      <DetailCardFact
        label="Estimate"
        value={
          issue.estimate === null ? 'No estimate' : `${issue.estimate} points`
        }
      />
      <DetailCardFact label="Started" value={formatDateTime(issue.startedAt)} />
      {issue.completedAt ? (
        <DetailCardFact
          label="Completed"
          value={formatDateTime(issue.completedAt)}
        />
      ) : null}
      {issue.canceledAt ? (
        <DetailCardFact
          label="Canceled"
          value={formatDateTime(issue.canceledAt)}
        />
      ) : null}
      <DetailCardFact label="Updated" value={formatDateTime(issue.updatedAt)} />
      <DetailCardFact label="Created" value={formatDateTime(issue.createdAt)} />
    </>
  )
  return (
    <div className="space-y-6">
      <Section title="Details">
        <div className="hidden sm:block">
          <DetailCardFacts className="grid-cols-1 gap-y-5">
            {facts}
          </DetailCardFacts>
        </div>
        <dl className="sm:hidden">
          <MobileFact
            label="Status"
            value={<IssueStatusBadge status={issue.status} />}
          />
          <MobileFact
            label="Priority"
            value={<IssuePriorityBadge priority={issue.priority} />}
          />
          {issue.blocked ? <MobileFact label="Blocked" value="Yes" /> : null}
          <MobileFact label="Project" value={project} />
          <MobileFact
            label="Assignee"
            value={userLabel(issue.assigneeUserId, userLabels)}
          />
          <MobileFact
            label="Creator"
            value={
              issue.creatorUserId
                ? (userLabels[issue.creatorUserId] ?? issue.creatorUserId)
                : 'Unknown creator'
            }
          />
          <MobileFact label="Due date" value={formatDateTime(issue.dueDate)} />
          <MobileFact
            label="Estimate"
            value={
              issue.estimate === null
                ? 'No estimate'
                : `${issue.estimate} points`
            }
          />
          <MobileFact label="Started" value={formatDateTime(issue.startedAt)} />
          {issue.completedAt ? (
            <MobileFact
              label="Completed"
              value={formatDateTime(issue.completedAt)}
            />
          ) : null}
          {issue.canceledAt ? (
            <MobileFact
              label="Canceled"
              value={formatDateTime(issue.canceledAt)}
            />
          ) : null}
          <MobileFact label="Updated" value={formatDateTime(issue.updatedAt)} />
          <MobileFact label="Created" value={formatDateTime(issue.createdAt)} />
          {issue.customFields.map((field) => (
            <MobileFact
              key={field.id}
              label={fieldLabels.get(field.fieldId) ?? field.fieldKey}
              value={formatCustomFieldValue(field.value)}
            />
          ))}
        </dl>
      </Section>
      {issue.labels?.length ? (
        <Section title="Labels">
          <div className="flex flex-wrap gap-1.5">
            {issue.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="px-2 py-0.5 text-xs"
                style={label.color ? { borderColor: label.color } : undefined}
              >
                <span
                  className="mr-1.5 size-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                  aria-hidden="true"
                />
                {label.name}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}
      {issue.customFields.length ? (
        <Section title="Custom fields">
          <div className="hidden sm:block">
            <DetailCardFacts className="grid-cols-1 gap-y-5 sm:grid-cols-2">
              {issue.customFields.map((field) => (
                <DetailCardFact
                  key={field.id}
                  label={fieldLabels.get(field.fieldId) ?? field.fieldKey}
                  value={formatCustomFieldValue(field.value)}
                />
              ))}
            </DetailCardFacts>
          </div>
        </Section>
      ) : null}
    </div>
  )
}

export function IssueDetail(props: IssueDetailProps) {
  return (
    <div className="space-y-6">
      <IssueDetailHeader {...props} />
      <IssueDetailBody {...props} />
      <IssueMetaRail {...props} />
    </div>
  )
}
