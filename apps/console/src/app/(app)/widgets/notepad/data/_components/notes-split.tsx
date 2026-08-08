'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

import { NoteDetail } from './note-detail'

export type AdminNoteRow = {
  id: string
  title: string
  body: string
  color: string | null
  pinned: boolean
  /** Unix seconds. */
  updatedAt: number
  createdAt: number
  ownerAccountId: string
  ownerName: string | null
  ownerEmail: string | null
  ownerAvatar: string | null
  /** Display name of the app the note was written in, when attributed. */
  sourceApp: string | null
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})
const pastYearFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/**
 * Short and absolute: "Jun 17, 2:26 PM" rather than a raw epoch integer or a
 * relative string, which forces an admin to do arithmetic to compare two rows.
 * Today collapses to the time alone, and a different year gains the year, so
 * the column stays narrow without ever being ambiguous.
 */
export function formatNoteTimestamp(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return timeFormat.format(date)
  if (date.getFullYear() !== now.getFullYear())
    return pastYearFormat.format(date)
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`
}

function initials(row: AdminNoteRow): string {
  const source = row.ownerName ?? row.ownerEmail ?? row.ownerAccountId
  const parts = source.trim().split(/\s+/).slice(0, 2)
  return (
    parts
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

const titleColumn: ColumnDef<AdminNoteRow, unknown> = {
  id: 'title',
  header: 'Note',
  cell: ({ row }) => (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate font-medium">
          {row.original.title || 'Untitled'}
        </span>
        {row.original.pinned && (
          <Badge variant="secondary" className="shrink-0">
            Pinned
          </Badge>
        )}
      </div>
      <div className="text-muted-foreground truncate text-xs">
        {formatNoteTimestamp(row.original.updatedAt)}
      </div>
    </div>
  ),
}

const fullColumns: ColumnDef<AdminNoteRow, unknown>[] = [
  {
    id: 'title',
    header: 'Note',
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">
          {row.original.title || 'Untitled'}
        </span>
        {row.original.pinned && (
          <Badge variant="secondary" className="shrink-0">
            Pinned
          </Badge>
        )}
      </div>
    ),
  },
  {
    id: 'owner',
    header: 'Owner',
    cell: ({ row }) => (
      <div
        className="flex min-w-0 items-center gap-2.5"
        title={row.original.ownerAccountId}
      >
        <Avatar size="sm">
          {row.original.ownerAvatar ? (
            <AvatarImage src={row.original.ownerAvatar} alt="" />
          ) : null}
          <AvatarFallback>{initials(row.original)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-[0.8125rem]">
            {row.original.ownerName ?? 'Unknown account'}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {row.original.ownerEmail ?? row.original.ownerAccountId}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'sourceApp',
    header: 'Written in',
    cell: ({ row }) =>
      row.original.sourceApp ? (
        <span className="text-[0.8125rem]">{row.original.sourceApp}</span>
      ) : (
        <span className="text-muted-foreground text-[0.8125rem]">Unattributed</span>
      ),
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <span className="text-[0.8125rem] whitespace-nowrap tabular-nums">
        {formatNoteTimestamp(row.original.updatedAt)}
      </span>
    ),
  },
]

export function NotesSplit({
  rows,
  selectedId,
  hasMore,
  ownerFilter,
  loadError,
}: {
  rows: AdminNoteRow[]
  selectedId?: string
  hasMore: boolean
  ownerFilter: string
  loadError: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = rows.find((row) => row.id === selectedId)

  function selectNote(id?: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (id) next.set('note', id)
    else next.delete('note')

    const query = next.toString()
    router.push(query ? `?${query}` : '/widgets/notepad/data')
  }

  if (loadError)
    return (
      <div className="876-card p-5">
        <p className="text-destructive text-[0.8125rem]">{loadError}</p>
      </div>
    )

  const empty = (
    <div className="text-muted-foreground py-6 text-center text-[0.8125rem]">
      {ownerFilter ? 'No notes for this account.' : 'No notes yet.'}
    </div>
  )

  const ownerChip = ownerFilter ? (
    <div className="flex items-center gap-2 text-[0.8125rem]">
      <span className="text-muted-foreground">Filtered to one account</span>
      <button
        type="button"
        className="text-primary hover:underline"
        onClick={() => {
          const next = new URLSearchParams(searchParams.toString())
          next.delete('owner')
          next.delete('note')
          const query = next.toString()
          router.push(query ? `?${query}` : '/widgets/notepad/data')
        }}
      >
        Show all accounts
      </button>
    </div>
  ) : null

  if (!selected)
    return (
      <div className="space-y-3">
        {ownerChip}
        <div className="876-card overflow-hidden">
          <DataTable
            columns={fullColumns}
            data={rows}
            onRowClick={(row) => selectNote(row.id)}
            emptyState={empty}
          />
        </div>
        {hasMore && (
          <p className="text-muted-foreground text-xs">
            Showing the 50 most recently updated notes.
          </p>
        )}
      </div>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr] lg:items-start">
      <div className="876-card self-start overflow-hidden">
        <DataTable
          columns={[titleColumn]}
          data={rows}
          onRowClick={(row) => selectNote(row.id)}
          rowClassName={(row) => (row.id === selected.id ? 'bg-muted/50' : '')}
        />
      </div>
      <NoteDetail
        key={selected.id}
        note={selected}
        onClose={() => selectNote()}
      />
    </div>
  )
}
