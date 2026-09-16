import Link from 'next/link'

import { formatDay } from '../finance/format-money'
import type { ActivityItem } from './types'

type ActivityFeedProps = {
  items: readonly ActivityItem[]
  hrefBases: Record<ActivityItem['subjectType'], string>
  nextHref: string | null
}

export function ActivityFeed({ items, hrefBases, nextHref }: ActivityFeedProps) {
  const days = new Map<string, ActivityItem[]>()
  for (const item of items) {
    const day = formatDay(item.createdAt)
    const group = days.get(day)
    if (group) {
      group.push(item)
    } else {
      days.set(day, [item])
    }
  }

  return (
    <section data-slot="activity-feed" aria-label="Activity" className="space-y-4">
      {items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No activity yet
        </p>
      ) : (
        Array.from(days, ([day, entries]) => (
          <section key={day} aria-label={day} className="space-y-2">
            <h2 className="text-sm font-semibold">{day}</h2>
            <ul className="flex flex-col gap-2">
              {entries.map((item) => (
                <li key={item.id} className="rounded-md border px-4 py-3">
                  <Link
                    href={`${hrefBases[item.subjectType].replace(/\/+$/, '')}/${encodeURIComponent(item.subjectId)}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {item.subjectLabel}
                  </Link>
                  <p className="mt-1 text-sm">{item.summary}</p>
                  {item.actorLabel !== null ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.actorLabel}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      {nextHref !== null ? (
        <Link href={nextHref} className="text-sm hover:underline">
          Load more
        </Link>
      ) : null}
    </section>
  )
}
