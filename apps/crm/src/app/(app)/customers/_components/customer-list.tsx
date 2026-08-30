'use client'

import {
  CondensedCustomersTable,
  CustomersTable,
} from '@876/crm-ui/customer-list'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import type { CrmCustomerRow } from '@/features/customers/types'

type Props = {
  customers: CrmCustomerRow[]
}

/** Route-aware adapter around the canonical shared CRM customer list. */
export function CustomerList({ customers }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedId = segments[0] ?? null
  const status = searchParams.get('status') ?? 'all'
  const query = searchParams.toString() || undefined

  const rows = useMemo(() => {
    if (status === 'active')
      return customers.filter((row) => row.status === 'ACTIVE')
    if (status === 'inactive')
      return customers.filter((row) => row.status === 'INACTIVE')
    return customers
  }, [customers, status])

  if (!selectedId)
    return (
      <CustomersTable
        customers={rows}
        customersHref="/customers"
        newCustomerHref="/customers/new"
        query={query}
      />
    )

  return (
    <CondensedCustomersTable
      customers={rows}
      selectedId={selectedId}
      customersHref="/customers"
      query={query}
    />
  )
}
