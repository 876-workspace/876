'use client'

import { useMemo } from 'react'
import type { AdminConsumerContact } from '@876/admin'
import { DataTable } from '@876/ui/data-table'

import {
  createContactColumns,
  type ContactRowActions,
} from './contacts-columns'

type Props = {
  contacts: AdminConsumerContact[]
  actions: ContactRowActions
  emptyState: React.ReactNode
}

export function ContactsTableView({ contacts, actions, emptyState }: Props) {
  const columns = useMemo(() => createContactColumns(actions), [actions])

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={contacts}
        className="min-w-[52rem]"
        emptyState={emptyState}
      />
    </div>
  )
}
