import Link from 'next/link'

import { buttonVariants } from '@876/ui/button'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  MoreHorizontalIcon,
  Plus,
  SearchIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

import { CONTACTS_SKELETON_COLUMNS } from './contacts-skeleton-columns'

export function ContactsPageSkeleton({ username }: { username: string }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          {/* Inert: this fallback is unmounted the moment the real manager
              streams in, so anything typed here would be silently discarded.
              Keeping the box at full size holds the row's height steady. */}
          <Input
            readOnly
            disabled
            tabIndex={-1}
            aria-hidden="true"
            placeholder="Search contacts by name, email, or nickname…"
            className="pl-9"
            aria-label="Search contacts"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/users/${username}/contacts/new`}
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Add contact
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({
                variant: 'outline',
                size: 'icon-sm',
              })}
              aria-label="More actions"
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-40">
              <DropdownMenuItem disabled>
                <ArrowUpFromLine className="size-4" />
                Import contacts
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <ArrowDownFromLine className="size-4" />
                Export contacts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <DataTableSkeleton columns={CONTACTS_SKELETON_COLUMNS} />
    </section>
  )
}
