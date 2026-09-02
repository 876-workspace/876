import type { AccessAppEntry } from './types'

type Props = {
  entries: AccessAppEntry[]
}

export function AppAccessSummary({ entries }: Props) {
  const entitledEntries = entries.filter((entry) => entry.entitled)

  if (entitledEntries.length === 0)
    return <p className="text-muted-foreground text-sm">No entitled apps</p>

  return (
    <ul
      className="divide-876-surface-border divide-y"
      aria-label="App access summary"
    >
      {entitledEntries.map((entry) => (
        <li
          key={entry.appId}
          className="flex items-center justify-between gap-4 py-2"
        >
          <span className="font-medium">{entry.appName}</span>
          <span className="text-muted-foreground text-sm">
            {entry.assigned ? (entry.role?.name ?? 'No role') : 'No access'}
          </span>
          <span className="text-sm tabular-nums">
            {entry.effectivePermissions.length} effective permissions
          </span>
        </li>
      ))}
    </ul>
  )
}
