'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@876/core/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { CrmRequestCategory, RequestPriority } from '@/types/crm'
import { CategoriesTable } from './categories-table'
import { CategoryCreateCard } from './category-create-card'
import { CategoryDetail } from './category-detail'
import { CondensedCategoryRow } from './category-row'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  categories: CrmRequestCategory[]
  priorities: RequestPriority[]
  teamNames: Record<string, string>
  selectedId?: string
  basePath?: string
}

export function CategorySplit({
  categories,
  priorities,
  teamNames,
  selectedId,
  basePath = '/settings/categories',
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = selectedId === 'new'
  const selected = categories.find((c) => c.id === selectedId)

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

    if (id) next.set('category', id)
    else next.delete('category')

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
    return (
      <CategoriesTable
        categories={categories}
        priorities={priorities}
        teamNames={teamNames}
        onSelect={select}
      />
    )
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
                Categories
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No categories yet
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <CondensedCategoryRow
                  key={category.id}
                  category={category}
                  selected={selected ? category.id === selected.id : false}
                  onSelect={() => select(category.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {isNew ? (
        <CategoryCreateCard
          priorities={priorities}
          teamNames={teamNames}
          onClose={requestClose}
          onSuccess={(id) => {
            select(id)
            router.refresh()
          }}
          className={panelClassName}
        />
      ) : selected ? (
        <CategoryDetail
          key={selected.id}
          category={selected}
          priorities={priorities}
          teamNames={teamNames}
          onClose={requestClose}
          className={panelClassName}
        />
      ) : null}
    </div>
  )
}
