'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminBillingAccount } from '@876/admin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { DataTable } from '@876/ui/data-table'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import {
  CreditCard,
  LayoutGrid,
  LayoutList,
  Mail,
  MoreHorizontalIcon,
  Pencil,
  Plus,
  SearchIcon,
  TableIcon,
  Trash,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { cn } from '@876/core/utils'

import { ViewSwitcher, type ViewOption } from '@/components/view-switcher'
import { client } from '@/lib/client'
import { formatDate } from '@/lib/format'

import { Fact, formatMoney } from './billing-shared'

export type AccountsView = 'grid' | 'table' | 'list'

type Props = {
  orgSlug: string
  accounts: AdminBillingAccount[]
  view: AccountsView
}

const VIEW_OPTIONS: ViewOption<AccountsView>[] = [
  { value: 'grid', label: 'Grid', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'list', label: 'List', icon: LayoutList },
]

export function AccountsManager({ orgSlug, accounts, view }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [accountToDelete, setAccountToDelete] =
    useState<AdminBillingAccount | null>(null)

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return accounts

    return accounts.filter((account) => {
      const parts = [
        account.name,
        account.email,
        account.invoice_email,
        account.currency,
        account.id,
      ].filter(Boolean) as string[]

      return parts.some((part) => part.toLowerCase().includes(trimmed))
    })
  }, [accounts, query])

  function removeAccount() {
    if (!accountToDelete) return

    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.billing.deleteAccount(
        accountToDelete.id
      )
      if (resultError) {
        setError(resultError.message)
        return
      }

      setAccountToDelete(null)
      router.refresh()
    })
  }

  const emptyState = (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {query.trim() ? (
            <SearchIcon aria-hidden="true" />
          ) : (
            <CreditCard aria-hidden="true" />
          )}
        </EmptyMedia>
        <EmptyTitle>
          {query.trim() ? 'No matching accounts' : 'No billing accounts'}
        </EmptyTitle>
        <EmptyDescription>
          {query.trim()
            ? `No accounts match "${query.trim()}".`
            : 'Add an account before attaching paid subscriptions.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search accounts..."
            className="pl-9"
            aria-label="Search billing accounts"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <ViewSwitcher value={view} options={VIEW_OPTIONS} />

          <Link
            href={`/orgs/${orgSlug}/billing/accounts/new`}
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Add account
          </Link>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {view === 'grid' ? (
        <AccountsGridView
          accounts={filtered}
          orgSlug={orgSlug}
          isPending={isPending}
          emptyState={emptyState}
          onDelete={setAccountToDelete}
        />
      ) : view === 'list' ? (
        <AccountsListView
          accounts={filtered}
          orgSlug={orgSlug}
          isPending={isPending}
          emptyState={emptyState}
          onDelete={setAccountToDelete}
        />
      ) : (
        <AccountsTableView
          accounts={filtered}
          orgSlug={orgSlug}
          isPending={isPending}
          emptyState={emptyState}
          onDelete={setAccountToDelete}
        />
      )}

      <DeleteAccountDialog
        account={accountToDelete}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open) setAccountToDelete(null)
        }}
        onDelete={removeAccount}
      />
    </section>
  )
}

function AccountsGridView({
  accounts,
  orgSlug,
  isPending,
  emptyState,
  onDelete,
}: {
  accounts: AdminBillingAccount[]
  orgSlug: string
  isPending: boolean
  emptyState: React.ReactNode
  onDelete: (account: AdminBillingAccount) => void
}) {
  if (accounts.length === 0) return <div className="876-card">{emptyState}</div>

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <article key={account.id} className="876-card flex flex-col p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sky-500/12 text-sky-700 dark:text-sky-300">
              <CreditCard className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {account.name || account.email || account.id}
              </p>
              <p className="text-muted-foreground truncate font-mono text-xs">
                {account.id}
              </p>
            </div>
            <AccountActions
              account={account}
              orgSlug={orgSlug}
              isPending={isPending}
              onDelete={onDelete}
            />
          </div>

          <div className="text-muted-foreground mt-3 flex items-start gap-1.5 text-sm">
            <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {account.invoice_email || account.email || 'No invoice email'}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <Fact
              label="Currency"
              value={(account.currency ?? 'n/a').toUpperCase()}
            />
            <Fact
              label="Balance"
              value={formatMoney(account.balance, account.currency)}
            />
            <Fact label="Updated" value={formatDate(account.updated_at)} />
          </dl>
        </article>
      ))}
    </div>
  )
}

function AccountsListView({
  accounts,
  orgSlug,
  isPending,
  emptyState,
  onDelete,
}: {
  accounts: AdminBillingAccount[]
  orgSlug: string
  isPending: boolean
  emptyState: React.ReactNode
  onDelete: (account: AdminBillingAccount) => void
}) {
  if (accounts.length === 0) return <div className="876-card">{emptyState}</div>

  return (
    <div className="876-card divide-876-surface-border divide-y overflow-hidden">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_8rem_8rem_auto] lg:items-center"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {account.name || account.email || account.id}
            </p>
            <p className="text-muted-foreground truncate font-mono text-xs">
              {account.id}
            </p>
          </div>
          <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {account.invoice_email || account.email || 'No invoice email'}
            </span>
          </div>
          <Badge variant="outline" className="justify-self-start">
            {(account.currency ?? 'n/a').toUpperCase()}
          </Badge>
          <span className="text-sm tabular-nums">
            {formatMoney(account.balance, account.currency)}
          </span>
          <AccountActions
            account={account}
            orgSlug={orgSlug}
            isPending={isPending}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  )
}

function AccountsTableView({
  accounts,
  orgSlug,
  isPending,
  emptyState,
  onDelete,
}: {
  accounts: AdminBillingAccount[]
  orgSlug: string
  isPending: boolean
  emptyState: React.ReactNode
  onDelete: (account: AdminBillingAccount) => void
}) {
  const columns = useMemo(
    () => createAccountColumns({ orgSlug, isPending, onDelete }),
    [orgSlug, isPending, onDelete]
  )

  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={accounts} emptyState={emptyState} />
    </div>
  )
}

function createAccountColumns({
  orgSlug,
  isPending,
  onDelete,
}: {
  orgSlug: string
  isPending: boolean
  onDelete: (account: AdminBillingAccount) => void
}): ColumnDef<AdminBillingAccount, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Account',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.original.name || row.original.email || row.original.id}
          </p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {row.original.id}
          </p>
        </div>
      ),
    },
    {
      id: 'invoice_email',
      header: 'Invoice email',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.invoice_email ||
            row.original.email ||
            'No invoice email'}
        </span>
      ),
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => (
        <Badge variant="outline">
          {(row.original.currency ?? 'n/a').toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatMoney(row.original.balance, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <AccountActions
          account={row.original}
          orgSlug={orgSlug}
          isPending={isPending}
          onDelete={onDelete}
        />
      ),
    },
  ]
}

function AccountActions({
  account,
  orgSlug,
  isPending,
  onDelete,
}: {
  account: AdminBillingAccount
  orgSlug: string
  isPending: boolean
  onDelete: (account: AdminBillingAccount) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        aria-label="Billing account actions"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-36">
        <DropdownMenuItem
          render={
            <Link
              href={`/orgs/${orgSlug}/billing/accounts/${account.id}/edit`}
            />
          }
        >
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onDelete(account)}
          disabled={isPending}
        >
          <Trash className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DeleteAccountDialog({
  account,
  isPending,
  onOpenChange,
  onDelete,
}: {
  account: AdminBillingAccount | null
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}) {
  return (
    <AlertDialog open={Boolean(account)} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Trash className="text-destructive size-8" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete billing account?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes{' '}
            <span className="text-foreground font-medium">
              {account?.name || account?.email || account?.id || 'this account'}
            </span>{' '}
            from this organization. Existing subscriptions may need another
            billing account assigned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
