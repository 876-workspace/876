'use client'

import Link from 'next/link'
import type { Project } from '@876/projects/contracts'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { buttonVariants } from '@876/ui/button'
import { Folder, Plus } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { ProjectHealthBadge, ProjectStatusBadge } from './status-badges'

export type ProjectsTableProps = {
  projects: readonly Project[]
  projectsHref: string
  newProjectHref?: string | null
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}

export function ProjectTableRow({
  project,
  projectsHref,
}: {
  project: Project
  projectsHref: string
}) {
  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-4">
        <RowLink
          href={`${projectsHref}/${project.id}`}
          label={`View project ${project.name}`}
        />
        <div className="min-w-0">
          <span className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {project.name}
          </span>
          {project.description ? (
            <p className="text-muted-foreground max-w-md truncate text-xs">
              {project.description}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="px-5 py-4 font-mono text-xs font-semibold">
        {project.key}
      </TableCell>
      <TableCell className="px-5 py-4 text-[0.8125rem] text-muted-foreground">
        {project.leadUserId ? (
          <span className="font-mono text-xs">{project.leadUserId}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-4">
        <ProjectStatusBadge status={project.status} />
      </TableCell>
      <TableCell className="px-5 py-4">
        <ProjectHealthBadge health={project.health} />
      </TableCell>
      <TableCell className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(project.targetDate)}
      </TableCell>
    </TableRow>
  )
}

export function ProjectsTable({
  projects,
  projectsHref,
  newProjectHref,
}: ProjectsTableProps) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Project
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Key
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Lead
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Status
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Health
            </TableHead>
            <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
              Target Date
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Folder className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No projects yet</EmptyTitle>
                  </EmptyHeader>
                  {newProjectHref ? (
                    <EmptyContent>
                      <Link
                        href={newProjectHref}
                        className={buttonVariants({
                          variant: 'info',
                          size: 'sm',
                        })}
                      >
                        <Plus className="size-4" strokeWidth={2.25} />
                        Add
                      </Link>
                    </EmptyContent>
                  ) : null}
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <ProjectTableRow
                key={project.id}
                project={project}
                projectsHref={projectsHref}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
