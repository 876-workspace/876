'use client'

import Link from 'next/link'
import type { Issue, Project } from '@876/projects/contracts'
import { buttonVariants } from '@876/ui/button'
import { ArrowLeft, Calendar, Folder, User, Users } from '@876/ui/icons'

import { IssuesTable } from './issue-list'
import { ProjectHealthBadge, ProjectStatusBadge } from './status-badges'

export type ProjectDetailProps = {
  project: Project
  issues?: readonly Issue[]
  issuesHref: string
  projectsHref: string
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ProjectDetail({
  project,
  issues = [],
  issuesHref,
  projectsHref,
}: ProjectDetailProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={projectsHref}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'mb-4 inline-flex items-center gap-1.5',
          })}
        >
          <ArrowLeft className="size-3.5" />
          Back to projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg border">
                <Folder className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{project.name}</h1>
                  <span className="text-muted-foreground font-mono text-sm font-semibold">
                    ({project.key})
                  </span>
                </div>
              </div>
            </div>
            {project.description ? (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                {project.description}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <ProjectHealthBadge health={project.health} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="876-card flex items-center gap-3 p-4">
          <User className="text-muted-foreground size-5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Project Lead</p>
            <p className="text-sm font-semibold">
              {project.leadUserId ? (
                <span className="font-mono text-xs">{project.leadUserId}</span>
              ) : (
                'Unassigned'
              )}
            </p>
          </div>
        </div>

        <div className="876-card flex items-center gap-3 p-4">
          <Calendar className="text-muted-foreground size-5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Target Date</p>
            <p className="text-sm font-semibold">
              {formatDate(project.targetDate)}
            </p>
          </div>
        </div>

        <div className="876-card flex items-center gap-3 p-4">
          <Users className="text-muted-foreground size-5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="text-sm font-semibold">{project.memberCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Project Issues</h2>
        <IssuesTable
          issues={issues}
          issuesHref={issuesHref}
        />
      </div>
    </div>
  )
}
