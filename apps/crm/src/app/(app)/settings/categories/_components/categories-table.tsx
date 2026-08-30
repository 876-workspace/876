'use client'

import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Plus, TagIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import type { CrmRequestCategory, RequestPriority } from '@/types/crm'
import { CategoryTableRow } from './category-row'

export function CategoriesTable({
  categories,
  priorities,
  teamNames,
  onSelect,
}: {
  categories: CrmRequestCategory[]
  priorities: RequestPriority[]
  teamNames: Record<string, string>
  onSelect: (id: string) => void
}) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="w-12 px-5 py-3.5">
              <span className="sr-only">Icon</span>
            </TableHead>
            <TableHead className="px-5 py-3.5">Category</TableHead>
            <TableHead className="px-5 py-3.5">Subcategories</TableHead>
            <TableHead className="px-5 py-3.5">Default team</TableHead>
            <TableHead className="px-5 py-3.5">Default priority</TableHead>
            <TableHead className="px-5 py-3.5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <TagIcon className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No categories yet</EmptyTitle>
                  </EmptyHeader>
                  <EmptyContent>
                    <Link
                      href="/settings/categories?category=new"
                      className={buttonVariants({
                        variant: 'info',
                        size: 'sm',
                      })}
                    >
                      <Plus className="size-4" strokeWidth={2.25} />
                      Add
                    </Link>
                  </EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <CategoryTableRow
                key={category.id}
                category={category}
                priorities={priorities}
                teamNames={teamNames}
                onSelect={onSelect}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
