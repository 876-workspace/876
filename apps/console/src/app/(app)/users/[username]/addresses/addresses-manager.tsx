'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { AdminAddress, AdminUser } from '@876/admin'
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
  MapPin,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'

import { client } from '@/lib/client'
import { ViewSwitcher, type ViewOption } from '@/components/view-switcher'
import type { ClientResult } from '@/types/api'

import type { AddressRowActions } from './addresses-columns'
import { AddressesGridView } from './addresses-grid-view'
import { AddressesListView } from './addresses-list-view'
import { AddressesPager } from './addresses-pager'
import { AddressesTableView } from './addresses-table-view'

export type AddressesView = 'table' | 'grid' | 'list'

const PAGE_SIZE = 10

const VIEW_OPTIONS: ViewOption<AddressesView>[] = [
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: LayoutList },
]

type Props = {
  user: AdminUser
  addresses: AdminAddress[]
  view: AddressesView
}

export function AddressesManager({ user, addresses, view }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return addresses
    return addresses.filter((address) => {
      const parts = [
        address.label,
        address.type,
        address.line1,
        address.line2,
        address.city,
        address.postal_code,
        address.country_code,
      ].filter(Boolean) as string[]
      return parts.some((part) => part.toLowerCase().includes(trimmed))
    })
  }, [addresses, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
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
    (address: AdminAddress) => {
      if (!window.confirm('Delete this address?')) return
      run(() => client.users.deleteAddress(user.id, address.id))
    },
    [user.id, run]
  )

  const actions: AddressRowActions = useMemo(
    () => ({
      isPending,
      onEdit: (address) => {
        router.push(`/users/${user.username}/addresses/${address.id}/edit`)
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
            <MapPin aria-hidden="true" />
          )}
        </EmptyMedia>
        <EmptyTitle>{isFiltering ? 'No matches' : 'No addresses'}</EmptyTitle>
        <EmptyDescription>
          {isFiltering
            ? `No addresses match “${query.trim()}”.`
            : 'Add a saved address for this user.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  const viewProps = { addresses: paged, actions, emptyState }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search addresses…"
            className="pl-9"
            aria-label="Search addresses"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <ViewSwitcher value={view} options={VIEW_OPTIONS} />

          <div className="flex items-center gap-2">
            <Link
              href={`/users/${user.username}/addresses/new`}
              className={buttonVariants({ variant: 'info', size: 'sm' })}
            >
              <Plus className="size-4" strokeWidth={2.25} />
              Add address
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
                  Import addresses
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <ArrowDownFromLine className="size-4" />
                  Export addresses
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {view === 'grid' ? (
        <AddressesGridView {...viewProps} />
      ) : view === 'list' ? (
        <AddressesListView {...viewProps} />
      ) : (
        <AddressesTableView {...viewProps} />
      )}

      <AddressesPager
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </section>
  )
}
