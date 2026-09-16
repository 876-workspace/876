import Link from 'next/link'

import type { UiActivityItem } from '../mappers'

function subjectHref(
  hrefBases: Record<UiActivityItem['subjectType'], string>,
  item: UiActivityItem
): string {
  return `${hrefBases[item.subjectType].replace(/\/+$/, '')}/${encodeURIComponent(item.subjectId)}`
}

export function ActivityFeed({
  items,
  hrefBases,
  nextHref,
}: {
  items: readonly UiActivityItem[]
  hrefBases: Record<UiActivityItem['subjectType'], string>
  nextHref: string | null
}) {
  const days = new Map<string, UiActivityItem[]>()
  for (const item of items) {
    const day = new Date(item.createdAt * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const group = days.get(day)
    if (group) group.push(item)
    else days.set(day, [item])
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
                  <div className="text-muted-foreground text-xs">
                    {item.kind}
                  </div>
                  <Link
                    href={subjectHref(hrefBases, item)}
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
