'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminApiKey } from '@876/admin'
import { cn } from '@876/core/utils'
import {
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontalIcon,
  Pencil,
  SearchIcon,
  Trash,
  XCircle,
} from '@876/ui/icons'
import { DataTable } from '@876/ui/data-table'
import { Button } from '@876/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { CursorPagination } from '@/components/cursor-pagination'
import { formatDate } from '@/lib/format'
import { client } from '@/lib/client'

type Props = {
  appId: string
  data: AdminApiKey[]
  hasMore: boolean
  firstId: string | null
  lastId: string | null
  toolbarAction?: React.ReactNode
}

type Action =
  | { type: 'rename'; key: AdminApiKey }
  | { type: 'revoke'; key: AdminApiKey }
  | { type: 'delete'; key: AdminApiKey }

function KeyIdCell({ id }: { id: string }) {
  const [visible, setVisible] = useState(false)
  const short = id.slice(0, 12) + '…'

  return (
    <span className="flex items-center gap-1.5 font-mono text-xs">
      <span className="text-muted-foreground">{visible ? id : short}</span>
      <button
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label={visible ? 'Hide ID' : 'Reveal ID'}
      >
        {visible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      </button>
    </span>
  )
}

function ActionsCell({
  row,
  onAction,
}: {
  row: AdminApiKey
  onAction: (action: Action) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover:bg-accent inline-flex size-7 items-center justify-center rounded-md"
        aria-label="Open menu"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onAction({ type: 'rename', key: row })}
        >
          <Pencil className="mr-2 size-3.5" />
          Rename
        </DropdownMenuItem>
        {!row.revoked && (
          <DropdownMenuItem
            onClick={() => onAction({ type: 'revoke', key: row })}
            className="text-amber-600 focus:text-amber-600"
          >
            <XCircle className="mr-2 size-3.5" />
            Revoke
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAction({ type: 'delete', key: row })}
          className="text-destructive focus:text-destructive"
        >
          <Trash className="mr-2 size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ApiKeysTable({
  appId,
  data,
  hasMore,
  firstId,
  lastId,
  toolbarAction,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [action, setAction] = useState<Action | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = data.filter((apiKey) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      apiKey.id.toLowerCase().includes(q) ||
      (apiKey.name && apiKey.name.toLowerCase().includes(q))
    )
  })

  function handleAction(a: Action) {
    setError(null)
    if (a.type === 'rename') setRenameValue(a.key.name ?? '')
    setAction(a)
  }

  function closeDialog() {
    setAction(null)
    setError(null)
  }

  function handleConfirm() {
    if (!action) return
    startTransition(async () => {
      setError(null)
      if (action.type === 'rename') {
        const { error: err } = await client.apiKeys.update(
          appId,
          action.key.id,
          { name: renameValue || null }
        )
        if (err) {
          setError(err.message)
          return
        }
      } else if (action.type === 'revoke') {
        const { error: err } = await client.apiKeys.revoke(appId, action.key.id)
        if (err) {
          setError(err.message)
          return
        }
      } else if (action.type === 'delete') {
        const { error: err } = await client.apiKeys.delete(appId, action.key.id)
        if (err) {
          setError(err.message)
          return
        }
      }
      closeDialog()
      router.refresh()
    })
  }

  const columns: ColumnDef<AdminApiKey, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name ?? (
            <span className="text-muted-foreground italic">Unnamed</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Key ID',
      cell: ({ row }) => <KeyIdCell id={row.original.id} />,
    },
    {
      accessorKey: 'revoked',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            row.original.revoked
              ? 'bg-secondary text-secondary-foreground border-transparent'
              : 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400'
          )}
        >
          {row.original.revoked ? 'Revoked' : 'Active'}
        </span>
      ),
    },
    {
      accessorKey: 'last_used_at',
      header: 'Last used',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.last_used_at
            ? formatDate(row.original.last_used_at)
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'expires_at',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.expires_at ? formatDate(row.original.expires_at) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ActionsCell row={row.original} onAction={handleAction} />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search API keys…"
            className="pl-9"
            aria-label="Search API keys"
          />
        </div>
        {toolbarAction}
      </div>

      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          emptyState={
            <Empty className="border-border/60 bg-muted/5 border-dashed py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyRound className="text-blue-600 dark:text-blue-400" />
                </EmptyMedia>
                <EmptyTitle className="text-foreground text-base font-semibold">
                  {query.trim() ? 'No matching API keys' : 'No API keys'}
                </EmptyTitle>
                <EmptyDescription className="text-muted-foreground/90 max-w-[360px] text-sm leading-relaxed">
                  {query.trim()
                    ? 'No API keys match the current search.'
                    : 'Create a key for server-to-server requests to the 876 API.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        />
        <CursorPagination
          firstId={firstId}
          lastId={lastId}
          hasMore={hasMore}
          count={data.length}
        />
      </div>

      {/* Rename dialog */}
      <Dialog
        open={action?.type === 'rename'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename API key</DialogTitle>
            <DialogDescription>
              Give this key a descriptive name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Production server"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="info" onClick={handleConfirm} disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog
        open={action?.type === 'revoke'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Revoking this key will immediately prevent any requests
              authenticated with it. The key will remain in the list but cannot
              be re-activated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-destructive px-1 text-sm">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={pending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={action?.type === 'delete'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the key. Any requests using it will fail
              immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-destructive px-1 text-sm">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={pending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
