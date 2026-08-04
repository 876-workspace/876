import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'

export type AuditLogFiltersValue = {
  q?: string
  app_name?: string
  event?: string
  user_id?: string
  path?: string
}

export function AuditLogFilters({
  filters,
}: {
  filters: AuditLogFiltersValue
}) {
  return (
    <form className="mb-4 grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(10rem,14rem)_minmax(10rem,14rem)_minmax(10rem,14rem)_auto_auto]">
      <Input
        name="q"
        placeholder="Search events, paths, users, request IDs"
        defaultValue={filters.q ?? ''}
      />
      <Input
        name="app_name"
        placeholder="App"
        defaultValue={filters.app_name ?? ''}
      />
      <Input
        name="event"
        placeholder="Event"
        defaultValue={filters.event ?? ''}
      />
      <Input name="path" placeholder="Path" defaultValue={filters.path ?? ''} />
      <button className={buttonVariants({ variant: 'brand' })} type="submit">
        Query
      </button>
      <Link
        href="/audit-log"
        className={buttonVariants({ variant: 'outline' })}
      >
        Clear
      </Link>
    </form>
  )
}
