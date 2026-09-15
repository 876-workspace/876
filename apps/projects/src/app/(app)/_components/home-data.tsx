import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Issue, Project } from '@876/projects/contracts'
import {
  avatarTone,
  MobileListCell,
  MobileListEmpty,
} from '@876/projects-ui/mobile-list'
import {
  formatIssueStatus,
  formatProjectStatus,
  issueStatusTone,
} from '@876/projects-ui/status-badges'
import { AppError } from '@876/ui/app-error'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  User,
  type IconComponent,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

const WEEK_SECONDS = 7 * 24 * 60 * 60
const LIST_LIMIT = 5

function isOpen(issue: Issue): boolean {
  return issue.completedAt === null && issue.canceledAt === null
}

function formatDay(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

type StatTone = 'sky' | 'violet' | 'amber' | 'rose'

const TONE_STYLES: Record<StatTone, string> = {
  sky: 'bg-sky-500 shadow-sky-500/25',
  violet: 'bg-violet-500 shadow-violet-500/25',
  amber: 'bg-amber-500 shadow-amber-500/25',
  rose: 'bg-rose-500 shadow-rose-500/25',
}

function StatTile({
  label,
  value,
  href,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  href: string
  icon: IconComponent
  tone: StatTone
}) {
  return (
    <Link
      href={href}
      className="bg-card active:bg-muted/60 group flex flex-col gap-3 rounded-[1.375rem] border border-black/[0.04] p-4 shadow-2xs transition-all active:scale-[0.98] dark:border-white/[0.06]"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-10 items-center justify-center rounded-[0.875rem] text-white shadow-lg',
          TONE_STYLES[tone]
        )}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <span className="text-[2rem] leading-none font-bold tracking-tight tabular-nums">
          {value}
        </span>
        <p className="text-muted-foreground mt-1 text-[0.8125rem] leading-4">
          {label}
        </p>
      </div>
    </Link>
  )
}

function SummaryGrid({
  mine,
  open,
  inProgress,
  dueSoon,
}: {
  mine: number
  open: number
  inProgress: number
  dueSoon: number
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile
        label="Mine"
        value={mine}
        href="/issues"
        icon={User}
        tone="sky"
      />
      <StatTile
        label="Open"
        value={open}
        href="/issues"
        icon={AlertCircle}
        tone="violet"
      />
      <StatTile
        label="In progress"
        value={inProgress}
        href="/board"
        icon={Clock}
        tone="amber"
      />
      <StatTile
        label="Due soon"
        value={dueSoon}
        href="/issues"
        icon={Calendar}
        tone="rose"
      />
    </div>
  )
}

function Section({
  title,
  href,
  children,
}: {
  title: string
  href: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[1.25rem] font-bold tracking-tight">{title}</h2>
        <Link
          href={href}
          className="group flex items-center gap-0.5 text-[0.9375rem] font-medium text-sky-600 dark:text-sky-400"
        >
          See all
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <ul className="bg-card flex flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.04] shadow-2xs dark:border-white/[0.06] [&>li+li_[data-cell-content]]:border-t">
        {children}
      </ul>
    </section>
  )
}

export async function HomeData({ nowSeconds }: { nowSeconds: number }) {
  const { orgId, userId } = await requireProjectsContext()
  const [issuesResult, projectsResult] = await Promise.all([
    projects.issues.list(orgId),
    projects.projects.list(orgId),
  ])

  const issues: Issue[] = issuesResult.data?.data ?? []
  const projectRows: Project[] = projectsResult.data?.data ?? []

  const open = issues.filter(isOpen)
  const mine = open.filter((issue) => issue.assigneeUserId === userId)
  const inProgress = open.filter((issue) => issue.startedAt !== null)
  const dueSoon = open.filter(
    (issue) =>
      issue.dueDate !== null && issue.dueDate <= nowSeconds + WEEK_SECONDS
  )
  const activeProjects = projectRows.filter(
    (project) => project.status !== 'completed' && project.status !== 'canceled'
  )
  const error = issuesResult.error ?? projectsResult.error

  return (
    <div className="flex flex-col gap-10">
      {error ? (
        <AppError
          title="Some of your work could not be loaded"
          error={error}
          variant="banner"
        />
      ) : null}

      <SummaryGrid
        mine={mine.length}
        open={open.length}
        inProgress={inProgress.length}
        dueSoon={dueSoon.length}
      />

      <div className="flex flex-col gap-8 lg:grid-cols-2 lg:gap-8">
        <Section title="My issues" href="/issues">
          {mine.length === 0 ? (
            <MobileListEmpty>Nothing assigned to you</MobileListEmpty>
          ) : (
            mine
              .slice(0, LIST_LIMIT)
              .map((issue) => (
                <MobileListCell
                  key={issue.id}
                  href={`/issues/${issue.identifier}`}
                  label={`View issue ${issue.identifier}`}
                  avatar={issue.projectKey.slice(0, 2)}
                  avatarClassName={issueStatusTone(issue.status)}
                  title={issue.title}
                  subtitle={`${issue.identifier} · ${formatIssueStatus(issue.status)}`}
                  meta={issue.dueDate ? formatDay(issue.dueDate) : undefined}
                />
              ))
          )}
        </Section>

        <Section title="Projects" href="/projects">
          {activeProjects.length === 0 ? (
            <MobileListEmpty>No active projects</MobileListEmpty>
          ) : (
            activeProjects
              .slice(0, LIST_LIMIT)
              .map((project) => (
                <MobileListCell
                  key={project.id}
                  href={`/projects/${project.id}`}
                  label={`View project ${project.name}`}
                  avatar={project.key.slice(0, 2)}
                  avatarClassName={avatarTone(project.key)}
                  title={project.name}
                  subtitle={`${project.key} · ${formatProjectStatus(project.status)}`}
                  meta={
                    project.targetDate
                      ? formatDay(project.targetDate)
                      : undefined
                  }
                />
              ))
          )}
        </Section>
      </div>
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3">
        {['a', 'b', 'c', 'd'].map((key) => (
          <div
            key={key}
            className="bg-card flex h-[8.5rem] flex-col justify-between rounded-[1.375rem] border border-black/[0.04] p-4 shadow-2xs dark:border-white/[0.06]"
          >
            <div className="bg-muted size-10 animate-pulse rounded-[0.875rem]" />
            <div className="space-y-2">
              <div className="bg-muted h-7 w-10 animate-pulse rounded" />
              <div className="bg-muted h-3.5 w-20 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="bg-muted h-5 w-28 rounded" />
          <div className="bg-card h-[4.5rem] animate-pulse rounded-[1.25rem]" />
          <div className="bg-card h-[4.5rem] animate-pulse rounded-[1.25rem]" />
          <div className="bg-card h-[4.5rem] animate-pulse rounded-[1.25rem]" />
        </div>
        <div className="hidden flex-col gap-3 lg:flex">
          <div className="bg-muted h-5 w-28 rounded" />
          <div className="bg-card h-[4.5rem] animate-pulse rounded-[1.25rem]" />
          <div className="bg-card h-[4.5rem] animate-pulse rounded-[1.25rem]" />
          <div className="bg-card h-[4.5rem] animate-pulse rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  )
}
