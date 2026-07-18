'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AdminConsumerContact, AdminUser } from '@876/admin'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  LayoutGrid,
  LayoutList,
  MoreHorizontalIcon,
  Plus,
  SearchIcon,
  TableIcon,
  UserPlus,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'

import { client } from '@/lib/client'
import { ViewSwitcher, type ViewOption } from '@/components/view-switcher'
import type { ClientResult } from '@/types/api'

import type { ContactRowActions } from './contacts-columns'
import { ContactsGridView } from './contacts-grid-view'
import { ContactsListView } from './contacts-list-view'
import { ContactsPager } from './contacts-pager'
import { ContactsTableView } from './contacts-table-view'
import { contactMatchesQuery } from './contact-utils'

export type ContactsView = 'table' | 'grid' | 'list'

const PAGE_SIZE = 10

const VIEW_OPTIONS: ViewOption<ContactsView>[] = [
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: LayoutList },
]

type Props = {
  user: AdminUser
  contacts: AdminConsumerContact[]
  view: ContactsView
}

export function ContactsManager({ user, contacts, view }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return contacts
    return contacts.filter((contact) => contactMatchesQuery(contact, trimmed))
  }, [contacts, query])

  // Page-level pagination shared by every view (table/grid/list). The contacts
  // API returns the full set in one request, so this slices the already-filtered
  // array client-side rather than using cursor pagination.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // Clamp instead of relying on an effect: the filtered set shrinks on search or
  // delete, which can push the current page out of range between renders.
  const safePage = Math.min(page, pageCount)
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setPage(1)
  }, [])

  const run = useCallback(
    <T,>(work: () => Promise<ClientResult<T>>, onSuccess?: () => void) => {
      setError(null)
      startTransition(async () => {
        const { error: resultError } = await work()
        if (resultError) {
          setError(resultError.message)
          return
        }
        onSuccess?.()
        router.refresh()
      })
    },
    [router]
  )

  const handleDelete = useCallback(
    (contact: AdminConsumerContact) => {
      if (!window.confirm('Delete this contact?')) return
      run(() => client.users.deleteContact(user.id, contact.id))
    },
    [user.id, run]
  )

  const actions: ContactRowActions = useMemo(
    () => ({
      isPending,
      onEdit: (contact) => {
        router.push(`/users/${user.username}/contacts/${contact.id}/edit`)
      },
      onDelete: handleDelete,
    }),
    [isPending, handleDelete, router, user.username]
  )

  const isFiltering = query.trim().length > 0
  const emptyState = (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isFiltering ? (
            <SearchIcon aria-hidden="true" />
          ) : (
            <UserPlus aria-hidden="true" />
          )}
        </EmptyMedia>
        <EmptyTitle>{isFiltering ? 'No matches' : 'No contacts'}</EmptyTitle>
        <EmptyDescription>
          {isFiltering
            ? `No contacts match “${query.trim()}”.`
            : "Add a saved contact by entering the other person's user ID."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  const viewProps = { contacts: paged, actions, emptyState }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search contacts by name, email, or nickname…"
            className="pl-9"
            aria-label="Search contacts"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <ViewSwitcher value={view} options={VIEW_OPTIONS} />

          <div className="flex items-center gap-2">
            <Link
              href={`/users/${user.username}/contacts/new`}
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
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {view === 'grid' ? (
        <ContactsGridView {...viewProps} />
      ) : view === 'list' ? (
        <ContactsListView {...viewProps} />
      ) : (
        <ContactsTableView {...viewProps} />
      )}

      <ContactsPager
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </section>
  )
}
