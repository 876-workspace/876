'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@876/core/utils'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ArrowTrendingUpIcon, Plus } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { RequestPriority } from '@/types/crm'
import { CondensedPriorityRow } from './priority-row'
import { PrioritiesTable } from './priorities-table'
import { PriorityDetail } from './priority-detail'
import { PriorityCreateCard } from './priority-create-card'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  priorities: RequestPriority[]
  selectedId?: string
  basePath?: string
}

export function PrioritySplit({
  priorities,
  selectedId,
  basePath = '/settings/priorities',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = selectedId === 'new'
  const selected = priorities.find((p) => p.id === selectedId)

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

    if (id) next.set('priority', id)
    else next.delete('priority')

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

  if (priorities.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ArrowTrendingUpIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No priorities yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/settings/priorities?priority=new"
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            <Plus className="size-4" strokeWidth={2.25} />
            Add
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  if (!selected && !isNew) {
    return <PrioritiesTable priorities={priorities} onSelect={select} />
  }

  const panelClassName = cn(
    'motion-safe:duration-300 motion-safe:ease-out',
    closing
      ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-right-4 motion-safe:fill-mode-forwards motion-safe:duration-200 motion-safe:ease-in'
      : isSwitch
        ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200'
        : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4'
  )

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-4 py-3 text-[0.8125rem] font-semibold">
                Priorities
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priorities.map((priority) => (
              <CondensedPriorityRow
                key={priority.id}
                priority={priority}
                selected={selected ? priority.id === selected.id : false}
                onSelect={() => select(priority.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {isNew ? (
        <PriorityCreateCard
          onClose={requestClose}
          onSuccess={(id) => {
            select(id)
            router.refresh()
          }}
          className={panelClassName}
        />
      ) : selected ? (
        <PriorityDetail
          key={selected.id}
          priority={selected}
          onClose={requestClose}
          className={panelClassName}
        />
      ) : null}
    </div>
  )
}
