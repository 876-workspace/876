import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerTimelineEntry {
  id: string
  actor: string
  verb: string
  target: string
  timestamp: string
}

interface CustomerTimelinePanelProps extends PanelProps {
  state: PanelState<CustomerTimelineEntry[]>
  title?: string
  emptyMessage?: string
}

export function CustomerTimelinePanel({
  state,
  title = 'Activity',
  emptyMessage = 'No activity has been recorded yet.',
  ...props
}: CustomerTimelinePanelProps) {
  return (
    <PanelFrame title={title} {...props}>
      {state.status === 'ready' ? (
        state.data.length ? (
          <ol className="space-y-4">
            {state.data.map((entry) => (
              <li key={entry.id} className="border-l pl-4">
                <p className="text-sm">
                  <span className="font-medium">{entry.actor}</span>{' '}
                  {entry.verb} {entry.target}
                </p>
                <time className="text-muted-foreground mt-1 block text-xs">
                  {entry.timestamp}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <Empty message={emptyMessage} />
        )
      ) : state.status === 'empty' ? (
        <Empty message={emptyMessage} />
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function CustomerTimelinePanelSkeleton({
  title = 'Activity',
}: {
  title?: string
}) {
  return (
    <PanelFrame title={title}>
      <PanelRowsSkeleton rows={3} />
    </PanelFrame>
  )
}

function Empty({ message }: { message: string }) {
  return <p className="text-muted-foreground py-4 text-sm">{message}</p>
}
