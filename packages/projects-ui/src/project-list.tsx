'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Project } from '@876/projects/contracts'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { buttonVariants } from '@876/ui/button'
import { Folder, Plus } from '@876/ui/icons'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { ResponsiveList, type ListRowMapping } from '@876/ui/responsive-list'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { isProjectStatus } from './status-options'
import { ProjectHealthBadge, ProjectStatusBadge } from './status-badges'

export type ProjectsTableProps = {
  projects: readonly Project[]
  projectsHref: string
  newProjectHref?: string | null
  emptyState?: ReactNode
}

export type ProjectsListProps = {
  projects: readonly Project[]
  projectsHref: string
  newProjectHref?: string | null
  emptyState?: ReactNode
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function createProjectRow(projectsHref: string): ListRowMapping<Project> {
  return {
    key: (project) => project.id,
    href: (project) => `${projectsHref}/${project.id}`,
    title: (project) => project.name,
    subtitle: (project) => (
      <span className="font-mono">{`${project.key} · ${project.memberCount} members`}</span>
    ),
    meta: (project) => <ProjectHealthBadge health={project.health} />,
    trailing: (project) => <ProjectStatusBadge status={project.status} />,
  }
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
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
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
      <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
        {formatDate(project.targetDate)}
      </TableCell>
    </TableRow>
  )
}

export function ProjectsTable({
  projects,
  projectsHref,
  newProjectHref,
  emptyState,
}: ProjectsTableProps) {
  return (
    <ResponsiveList
      rows={projects}
      mapping={createProjectRow(projectsHref)}
      empty={
        <li className="text-muted-foreground px-4 py-10 text-center text-sm">
          No projects yet
        </li>
      }
      table={
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
                    {emptyState ?? (
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
                    )}
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
      }
    />
  )
}

/**
 * The list column for project routes: the full table on its own, and
 * a condensed pane once a project opens beside it.
 */
export function ProjectsList({
  projects,
  projectsHref,
  newProjectHref,
  emptyState,
}: ProjectsListProps) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole project set, so this narrows what was fetched either way.
  const status = searchParams.get('status') ?? undefined
  const rows = isProjectStatus(status)
    ? projects.filter((row) => row.status === status)
    : projects

  if (!selectedId)
    return (
      <ProjectsTable
        projects={rows}
        projectsHref={projectsHref}
        newProjectHref={newProjectHref}
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Projects</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No projects yet</ListPaneEmpty>
        ) : (
          rows.map((project) => (
            <ListPaneItem
              key={project.id}
              href={
                query
                  ? `${projectsHref}/${project.id}?${query}`
                  : `${projectsHref}/${project.id}`
              }
              selected={project.id === selectedId}
              label={`View project ${project.name}`}
              title={project.name}
              subtitle={project.key}
              trailing={<ProjectStatusBadge status={project.status} />}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
