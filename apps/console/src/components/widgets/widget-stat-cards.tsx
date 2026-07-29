import 'server-only'

import type { WidgetMetadata } from '@876/widgets'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { $876 } from '@/lib/876'

type Stat = {
  label: string
  value: string
  detail: string
}

const numberFormat = new Intl.NumberFormat('en-US')

function share(part: number, whole: number): string {
  if (whole === 0) return 'no notes yet'
  return `${Math.round((part / whole) * 100)}% of all notes`
}

/**
 * Per-widget usage, read from the bounded context that owns the widget's
 * content. Only widgets whose data lives in the Widgets service can report
 * these; anything else has no aggregate to show and renders nothing rather
 * than a row of zeroes that reads like real data.
 */
export async function WidgetStatCards({ widget }: { widget: WidgetMetadata }) {
  if (widget.id !== 'notepad' || widget.dataOwner !== 'widgets') return null

  const session = await getAuthSession()
  if (!isSignedSession(session)) return null

  const { data, error } = await $876.widgets.admin.stats.notepad({
    userId: session.user.id,
  })
  if (error || !data) {
    return (
      <p className="text-muted-foreground text-sm">
        Usage is unavailable right now.
      </p>
    )
  }

  const stats: Stat[] = [
    {
      label: 'Notes',
      value: numberFormat.format(data.notes),
      detail: `${numberFormat.format(data.notes_created_last_30d)} created in 30 days`,
    },
    {
      label: 'Accounts using it',
      value: numberFormat.format(data.accounts),
      detail: `${numberFormat.format(data.active_accounts_last_30d)} active in 30 days`,
    },
    {
      label: 'Collections',
      value: numberFormat.format(data.collections),
      detail: `${numberFormat.format(data.filed_notes)} notes filed`,
    },
    {
      label: 'Pinned',
      value: numberFormat.format(data.pinned_notes),
      detail: share(data.pinned_notes, data.notes),
    },
  ]

  return (
    <section
      aria-label={`${widget.name} usage`}
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="876-card flex flex-col gap-1 p-5">
          <span className="text-muted-foreground text-xs">{stat.label}</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {stat.value}
          </span>
          <span className="text-muted-foreground text-xs">{stat.detail}</span>
        </div>
      ))}
    </section>
  )
}
