import type { MilestoneDetail, Project } from '@876/projects/contracts'
import { Badge } from '@876/ui/badge'
import Link from 'next/link'

import { formatDate } from './format-date'
import {
  avatarTone,
  MobileList,
  MobileListCell,
  MobileListEmpty,
} from './mobile-list'

export type PhaseListProps = {
  phases: readonly MilestoneDetail[]
  projects: readonly Project[]
  ownerLabels?: Readonly<Record<string, string>>
  phasesHref?: string
}

function statusBadge(status: string) {
  if (status === 'completed') return <Badge variant="success">Completed</Badge>
  if (status === 'canceled') return <Badge variant="secondary">Canceled</Badge>
  return <Badge variant="info">Open</Badge>
}

function PhaseCell({
  phase,
  projectName,
  phasesHref,
}: {
  phase: MilestoneDetail
  projectName: string
  phasesHref: string
}) {
  return (
    <MobileListCell
      href={`${phasesHref}/${encodeURIComponent(phase.id)}`}
      label={`View phase ${phase.name}`}
      avatar={phase.key.slice(0, 2).toUpperCase()}
      avatarClassName={avatarTone(phase.key)}
      title={phase.name}
      subtitle={
        <>
          {projectName} · {statusBadge(phase.status)}
        </>
      }
      meta={phase.targetDate ? formatDate(phase.targetDate) : undefined}
    />
  )
}

export function PhaseList({
  phases,
  projects,
  ownerLabels = {},
  phasesHref = '/phases',
}: PhaseListProps) {
  const projectNames = new Map(
    projects.map((project) => [project.id, project.name])
  )

  if (phases.length === 0)
    return (
      <>
        <MobileList>
          <MobileListEmpty>No phases yet.</MobileListEmpty>
        </MobileList>
        <div className="876-card text-muted-foreground hidden px-5 py-10 text-center text-sm sm:block">
          No phases yet.
        </div>
      </>
    )

  return (
    <>
      <MobileList>
        {phases.map((phase) => (
          <PhaseCell
            key={phase.id}
            phase={phase}
            projectName={projectNames.get(phase.projectId) ?? phase.projectId}
            phasesHref={phasesHref}
          />
        ))}
      </MobileList>
      <div className="876-card hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {phases.map((phase) => (
                <tr key={phase.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`${phasesHref}/${encodeURIComponent(phase.id)}`}
                      className="font-medium hover:underline"
                    >
                      {phase.name}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {phase.key}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {projectNames.get(phase.projectId) ?? phase.projectId}
                  </td>
                  <td className="px-4 py-3">{statusBadge(phase.status)}</td>
                  <td className="px-4 py-3">
                    {phase.ownerUserId
                      ? (ownerLabels[phase.ownerUserId] ?? phase.ownerUserId)
                      : 'Unassigned'}
                  </td>
                  <td className="px-4 py-3">{formatDate(phase.targetDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
