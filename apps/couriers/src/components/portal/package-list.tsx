import Link from 'next/link'

import { ChevronRight } from '@876/ui/icons'

import type { PortalPackage } from '@/types/package'

import { PackageStatusBadge } from './package-status-badge'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function PackageList({ packages }: { packages: PortalPackage[] }) {
  return (
    <div className="bg-card divide-y overflow-hidden rounded-xl border shadow-xs">
      {packages.map((item) => (
        <Link
          key={item.id}
          href={`/portal/packages/${item.id}`}
          className="hover:bg-muted/50 focus-visible:ring-ring grid grid-cols-[1fr_auto] gap-3 px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {item.description || item.trackingNum || 'Package'}
            </div>
            {item.description && item.trackingNum ? (
              <div className="text-muted-foreground mt-0.5 truncate text-xs">
                {item.trackingNum}
              </div>
            ) : null}
          </div>
          <ChevronRight className="text-muted-foreground row-span-2 size-4 self-center sm:order-4 sm:row-span-1" />
          <div className="flex items-center gap-2 sm:justify-end">
            <PackageStatusBadge status={item.status} />
          </div>
          <time className="text-muted-foreground text-xs sm:min-w-24 sm:text-right">
            {DATE_FORMATTER.format(new Date(item.createdAt * 1000))}
          </time>
        </Link>
      ))}
    </div>
  )
}
