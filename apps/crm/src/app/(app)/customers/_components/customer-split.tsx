'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@876/core/utils'
import { Table, TableBody, TableCell, TableRow } from '@876/ui/table'

import { CustomerCreateCard } from './customer-create-card'
import { CustomerCard } from './customer-card'
import { CondensedCustomerRow } from './customer-row'
import { CustomersTable, type CrmCustomerRow } from './customers-table'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  customers: CrmCustomerRow[]
  selectedId?: string
  basePath?: string
}

export function CustomerSplit({
  customers,
  selectedId,
  basePath = '/customers',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = selectedId === 'new'
  const selected = customers.find((c) => c.profileId === selectedId)

  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [entrance, setEntrance] = useState<{
    id?: string
    kind: 'open' | 'switch'
  }>({ id: selectedId, kind: 'switch' })

  if (entrance.id !== selectedId) {
    setEntrance({
      id: selectedId,
      kind: entrance.id === undefined ? 'open' : 'switch',
    })
  }

  const isSwitch = entrance.kind === 'switch'

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  function select(id?: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (closing) setClosing(false)

    const next = new URLSearchParams(searchParams.toString())

    if (id) next.set('customer', id)
    else next.delete('customer')

    const query = next.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  function requestClose() {
    if (closing) return
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      setClosing(false)
      select()
    }, EXIT_MS)
  }

  if (!selected && !isNew) {
    return <CustomersTable customers={customers} onSelect={select} />
  }

  const panelClassName = cn(
    // Column 2, spanning the toolbar row and the list row: the panel is the
    // full height of the page column and is not pushed down by the heading.
    'md:col-start-2 md:row-start-1 md:row-span-3 md:min-h-0',
    'motion-safe:duration-300 motion-safe:ease-out',
    closing
      ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-right-4 motion-safe:fill-mode-forwards motion-safe:duration-200 motion-safe:ease-in'
      : isSwitch
        ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200'
        : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4'
  )

  return (
    /*
     * `md:contents` dissolves this wrapper at md+ so the list and the panel
     * become direct items of the page grid. That is what lets the panel span
     * the toolbar row and start at the top while the list stays beneath the
     * heading. Below md it stays a plain stacked column.
     */
    <div className="flex flex-col gap-4 md:contents">
      <div className="876-card flex flex-col overflow-hidden md:col-start-1 md:row-start-3 md:min-h-0">
        <header className="876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold">
          Customers
        </header>
        <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Table>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                    No customers yet
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <CondensedCustomerRow
                    key={customer.profileId}
                    customer={customer}
                    selected={
                      selected
                        ? customer.profileId === selected.profileId
                        : false
                    }
                    onSelect={() => select(customer.profileId)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {isNew ? (
        <CustomerCreateCard
          onClose={requestClose}
          onSuccess={(id) => {
            select(id)
            router.refresh()
          }}
          className={panelClassName}
        />
      ) : selected ? (
        <CustomerCard
          key={selected.profileId}
          customer={selected}
          onClose={requestClose}
          className={panelClassName}
        />
      ) : null}
    </div>
  )
}
