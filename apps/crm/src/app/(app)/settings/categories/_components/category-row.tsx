'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { CategoryIcon } from '@876/ui/category-icons'
import { TableCell, TableRow } from '@876/ui/table'
import type { CrmRequestCategory, RequestPriority } from '@/types/crm'
import { getCategoryColorVariant } from './category-color-picker'

export function CondensedCategoryRow({
  category,
  selected,
  onSelect,
}: {
  category: CrmRequestCategory
  selected?: boolean
  onSelect: () => void
}) {
  const colorVariant = getCategoryColorVariant(category.color)
  const subcategoryCount = category.subcategories?.length ?? 0

  return (
    <TableRow
      className={cn(
        'hover:bg-muted/40 cursor-pointer transition-colors',
        selected && 'bg-muted/60'
      )}
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      role="button"
      aria-label={`View category ${category.name}`}
      aria-pressed={selected}
    >
      <TableCell className="py-3 pr-3 pl-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg border',
              colorVariant.bg,
              colorVariant.text,
              colorVariant.border
            )}
          >
            <CategoryIcon name={category.icon} className="size-3.5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={cn(
                  'truncate text-[0.8125rem] font-medium text-sky-600 dark:text-sky-400',
                  selected && 'font-semibold'
                )}
              >
                {category.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground truncate text-[0.6875rem]">
                {subcategoryCount === 0
                  ? 'No subcategories'
                  : subcategoryCount === 1
                    ? '1 subcategory'
                    : `${subcategoryCount} subcategories`}
              </span>
              {!category.isActive ? (
                <span className="text-muted-foreground text-[0.625rem]">
                  · Archived
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function CategoryTableRow({
  category,
  priorities,
  teamNames,
  selected,
  onSelect,
}: {
  category: CrmRequestCategory
  priorities: RequestPriority[]
  teamNames: Record<string, string>
  selected?: boolean
  onSelect?: (id: string) => void
}) {
  const router = useRouter()
  const colorVariant = getCategoryColorVariant(category.color)
  const priorityNames = new Map(
    priorities.map((priority) => [priority.id, priority.name])
  )
  const subcategoryCount = category.subcategories?.length ?? 0

  function handleClick() {
    if (onSelect) {
      onSelect(category.id)
    } else {
      router.push(
        `/settings/categories?category=${encodeURIComponent(category.id)}`
      )
    }
  }

  return (
    <TableRow
      className={cn(
        'hover:bg-muted/40 cursor-pointer transition-colors',
        selected && 'bg-muted/50'
      )}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleClick()
        }
      }}
      role="button"
      aria-label={`View category ${category.name}`}
      aria-pressed={selected}
    >
      <TableCell className="py-4 pr-0 pl-5">
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg border',
            colorVariant.bg,
            colorVariant.text,
            colorVariant.border
          )}
        >
          <CategoryIcon name={category.icon} className="size-4" />
        </div>
      </TableCell>
      <TableCell className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[0.8125rem] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {category.name}
          </span>
        </div>
        {category.description ? (
          <p className="text-muted-foreground max-w-xs truncate text-xs">
            {category.description}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {subcategoryCount === 0 ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <span className="tabular-nums">
            {subcategoryCount === 1
              ? '1 subcategory'
              : `${subcategoryCount} subcategories`}
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {category.defaultTeamId
          ? (teamNames[category.defaultTeamId] ?? category.defaultTeamId)
          : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-4 text-[0.8125rem]">
        {category.defaultPriorityId
          ? (priorityNames.get(category.defaultPriorityId) ??
            category.defaultPriorityId)
          : '—'}
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant={category.isActive ? 'success' : 'secondary'}>
          {category.isActive ? 'Active' : 'Archived'}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
