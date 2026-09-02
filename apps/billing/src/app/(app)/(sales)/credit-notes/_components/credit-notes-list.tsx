'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Badge } from '@876/ui/badge'

import { CreditNotesTable } from './credit-notes-table'
import type { CreditNoteRow } from './credit-notes-table'

type Props = {
  creditNotes: CreditNoteRow[]
  emptyState?: ReactNode
}

function statusVariant(
  status: string
): 'info' | 'secondary' | 'success' | 'destructive' {
  switch (status.toLowerCase()) {
    case 'open':
      return 'info'
    case 'closed':
      return 'success'
    case 'draft':
      return 'secondary'
    case 'void':
      return 'secondary'
    default:
      return 'secondary'
  }
}

export function CreditNotesList({ creditNotes, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = searchParams.get('status')
  const validStatuses = ['draft', 'open', 'closed', 'void']
  const selectedStatus = validStatuses.includes(status ?? '') ? status! : 'all'

  const rows =
    selectedStatus === 'all'
      ? creditNotes
      : creditNotes.filter((row) => row.status.toLowerCase() === selectedStatus)

  if (!selectedId)
    return <CreditNotesTable creditNotes={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Credit Notes</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No credit notes yet</ListPaneEmpty>
        ) : (
          rows.map((cn) => (
            <ListPaneItem
              key={cn.id}
              href={
                query
                  ? `/credit-notes/${cn.id}?${query}`
                  : `/credit-notes/${cn.id}`
              }
              selected={cn.id === selectedId}
              label={`View credit note ${cn.number}`}
              title={cn.number}
              subtitle={cn.customer.name}
              trailing={
                <Badge variant={statusVariant(cn.status)}>
                  <span className="capitalize">{cn.status.toLowerCase()}</span>
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
