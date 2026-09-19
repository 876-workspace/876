import type { Issue, Project } from '@876/projects/contracts'
import type { ReactNode } from 'react'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Calendar, Folder, User, Users } from '@876/ui/icons'

import { formatDate } from './format-date'
import { IssuesTable } from './issue-list'
import { MobileFact, MobileFactList } from './mobile-list'
import {
  formatProjectHealth,
  formatProjectStatus,
  ProjectHealthBadge,
  ProjectStatusBadge,
} from './status-badges'

export type ProjectDetailProps = {
  project: Project
  issues?: readonly Issue[]
  issuesHref: string
  issueTotal?: number | null
  issuesHasMore?: boolean
  leadLabel?: string | null
  mobileActions?: ReactNode
}

function isTerminal(issue: Issue): boolean {
  const category = issue.state?.category
  return (
    category === 'completed' ||
    category === 'canceled' ||
    issue.status === 'done' ||
    issue.status === 'canceled'
  )
}

function isStarted(issue: Issue): boolean {
  return (
    issue.state?.category === 'started' ||
    issue.status === 'in-progress' ||
    issue.status === 'in-review'
  )
}

export function ProjectDetail({
  project,
  issues = [],
  issuesHref,
  issueTotal,
  issuesHasMore = false,
  leadLabel,
  mobileActions,
}: ProjectDetailProps) {
  const now = Math.floor(Date.now() / 1000)
  const completeSet = !issuesHasMore
  const total = issueTotal ?? issues.length
  const open = issues.filter((issue) => !isTerminal(issue)).length
  const completed = issues.filter((issue) => isTerminal(issue)).length
  const inProgress = issues.filter((issue) => isStarted(issue)).length
  const overdue = issues.filter(
    (issue) =>
      issue.dueDate !== null && issue.dueDate < now && !isTerminal(issue)
  ).length

  return (
    <div className="space-y-8">
      <header className="sm:hidden">
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 text-[2rem] leading-tight font-bold tracking-tight">
            {project.name}
          </h1>
          {mobileActions ? (
            <div
              data-testid="project-mobile-actions"
              className="flex shrink-0 items-center gap-2"
            >
              {mobileActions}
            </div>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 text-[0.8125rem]">
          <span className="font-mono">{project.key}</span>
          <span aria-hidden="true">·</span>
          <span>{formatProjectStatus(project.status)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatProjectHealth(project.health)}</span>
        </div>
        {project.description ? (
          <p className="text-muted-foreground mt-3 line-clamp-3 text-[0.9375rem] leading-6">
            {project.description}
          </p>
        ) : null}
      </header>

      <header className="876-card hidden p-5 sm:block sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <span
              data-testid="project-folder-icon"
              className="bg-primary/10 text-primary border-primary/15 hidden size-12 shrink-0 items-center justify-center rounded-xl border sm:flex"
            >
              <Folder aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                  {project.name}
                </h1>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
                  {project.key}
                </span>
              </div>
              {project.description ? (
                <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                  {project.description}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  No project description has been added.
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <ProjectHealthBadge health={project.health} />
          </div>
        </div>
      </header>

      <section className="sm:hidden">
        <MobileFactList>
          <MobileFact
            label="Project lead"
            value={leadLabel ?? project.leadUserId}
          />
          <MobileFact label="Members" value={project.memberCount} />
          <MobileFact label="Customer" value={project.customerId} />
          <MobileFact
            label="Start date"
            value={project.startDate ? formatDate(project.startDate) : null}
          />
          <MobileFact
            label="Target date"
            value={project.targetDate ? formatDate(project.targetDate) : null}
          />
          <MobileFact
            label="Last updated"
            value={formatDate(project.updatedAt)}
          />
        </MobileFactList>
      </section>

      <section className="876-card hidden px-5 py-5 sm:block sm:px-6">
        <DetailCardSection title="Overview">
          <DetailCardFacts className="sm:grid-cols-3">
            <DetailCardFact
              label={
                <span className="inline-flex items-center gap-1.5">
                  <User aria-hidden="true" className="size-3.5" />
                  Project lead
                </span>
              }
              value={leadLabel ?? project.leadUserId ?? 'No lead assigned'}
              mono={Boolean(project.leadUserId && !leadLabel)}
            />
            <DetailCardFact
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Users aria-hidden="true" className="size-3.5" />
                  Members
                </span>
              }
              value={`${project.memberCount} ${project.memberCount === 1 ? 'member' : 'members'}`}
            />
            <DetailCardFact
              label="Customer"
              value={project.customerId ?? 'No customer linked'}
              mono={Boolean(project.customerId)}
            />
            <DetailCardFact
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Calendar aria-hidden="true" className="size-3.5" />
                  Start date
                </span>
              }
              value={
                project.startDate
                  ? formatDate(project.startDate)
                  : 'No start date'
              }
            />
            <DetailCardFact
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Calendar aria-hidden="true" className="size-3.5" />
                  Target date
                </span>
              }
              value={
                project.targetDate
                  ? formatDate(project.targetDate)
                  : 'No target date'
              }
            />
            <DetailCardFact
              label="Last updated"
              value={formatDate(project.updatedAt)}
            />
          </DetailCardFacts>
        </DetailCardSection>
      </section>

      <section data-testid="mobile-work-overview" className="sm:hidden">
        <div className="flex gap-5 overflow-x-auto pb-1 tabular-nums">
          {[
            [total, 'items'],
            [completeSet ? open : '—', 'open'],
            [completeSet ? inProgress : '—', 'in progress'],
            [completeSet ? completed : '—', 'done'],
            [completeSet ? overdue : '—', 'overdue'],
          ].map(([value, label]) => (
            <div key={label as string} className="shrink-0">
              <p className="text-[0.9375rem] font-semibold">{value}</p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="876-card hidden px-5 py-5 sm:block sm:px-6">
        <DetailCardSection title="Work overview">
          <DetailCardFacts className="grid-cols-2 gap-y-5 sm:grid-cols-5">
            <DetailCardFact label="Work items" value={String(total)} />
            <DetailCardFact
              label="Open"
              value={completeSet ? String(open) : '—'}
            />
            <DetailCardFact
              label="In progress"
              value={completeSet ? String(inProgress) : '—'}
            />
            <DetailCardFact
              label="Completed"
              value={completeSet ? String(completed) : '—'}
            />
            <DetailCardFact
              label="Overdue"
              value={completeSet ? String(overdue) : '—'}
            />
          </DetailCardFacts>
          {issuesHasMore ? (
            <p className="text-muted-foreground mt-4 text-xs">
              Detailed work counts are hidden because this project has more work
              items than the current workspace page loaded.
            </p>
          ) : null}
        </DetailCardSection>
      </section>

      <DetailCardSection title="Work" className="space-y-3">
        <IssuesTable issues={issues} issuesHref={issuesHref} />
      </DetailCardSection>
    </div>
  )
}
