import { RouteTabs } from '@876/ui/route-tabs'

/**
 * The project record tab strip, shared by 876's own `/projects` section and
 * by every organization workspace. Built from route params only, so switching
 * tabs never waits on record data
 * (`.claude/rules/navigation-performance.md` §2).
 */
export function ProjectTabs({
  base,
  projectId,
}: {
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
}) {
  const record = `${base}/projects/${encodeURIComponent(projectId)}`

  return (
    <RouteTabs
      tabs={[
        { label: 'Overview', href: record, exact: true },
        { label: 'Activity', href: `${record}/activity` },
        { label: 'Discussions', href: `${record}/discussions` },
        { label: 'Wiki', href: `${record}/wiki` },
        { label: 'Clients', href: `${record}/clients` },
        { label: 'Gantt', href: `${record}/gantt` },
        { label: 'Time', href: `${record}/time` },
        { label: 'Finance', href: `${record}/finance` },
        { label: 'Attachments', href: `${record}/attachments` },
      ]}
      className="mb-4"
    />
  )
}
