'use client'

import { useMemo } from 'react'
import type { AdminAddress } from '@876/admin'
import { DataTable } from '@876/ui/data-table'

import {
  createAddressColumns,
  type AddressRowActions,
} from './addresses-columns'

type Props = {
  addresses: AdminAddress[]
  actions: AddressRowActions
  emptyState: React.ReactNode
}

export function AddressesTableView({ addresses, actions, emptyState }: Props) {
  const columns = useMemo(() => createAddressColumns(actions), [actions])

  return (
    <DataTable
      columns={columns}
      data={addresses}
      className="min-w-[64rem]"
      emptyState={<div className="876-card">{emptyState}</div>}
    />
  )
}
