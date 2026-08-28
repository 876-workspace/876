'use client'

import { showAppErrorToast } from '@876/ui/app-error-toast'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { CategoryIcon, isCategoryIconKey } from '@876/ui/category-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MoreHorizontalIcon,
  Pencil,
  Plus,
  Trash,
} from '@876/ui/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { categoryColorClass } from '@/features/categories/category-color'
import { client } from '@/lib/client'
import type {
  CrmRequestCategory,
  CrmRequestSubcategory,
  RequestPriority,
} from '@/types/crm'

import { CategoryFormDialog, type CategoryDraft } from './category-form-dialog'
import {
  SubcategoryFormDialog,
  type SubcategoryDraft,
} from './subcategory-form-dialog'

export function CategoriesList({
  categories,
  priorities,
  teamNames,
  createOpen = false,
}: {
  categories: CrmRequestCategory[]
  priorities: RequestPriority[]
  teamNames: Record<string, string>
  createOpen?: boolean
}) {
  const router = useRouter()
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(createOpen)
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>()
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false)
  const [subcategoryDraft, setSubcategoryDraft] = useState<SubcategoryDraft>()
  const priorityNames = new Map(
    priorities.map((priority) => [priority.id, priority.name])
  )

  function editCategory(category: CrmRequestCategory) {
    setCategoryDraft({
      id: category.id,
      name: category.name,
      color: category.color ?? 'blue',
      icon: isCategoryIconKey(category.icon) ? category.icon : 'tag',
      defaultPriorityId: category.defaultPriorityId,
    })
    setCategoryDialogOpen(true)
  }

  function addSubcategory(category: CrmRequestCategory) {
    setSubcategoryDraft({
      categoryId: category.id,
      name: '',
      color: category.color,
      icon: category.icon,
      defaultPriorityId: null,
    })
    setSubcategoryDialogOpen(true)
  }

  function editSubcategory(
    category: CrmRequestCategory,
    subcategory: CrmRequestSubcategory
  ) {
    setSubcategoryDraft({
      id: subcategory.id,
      categoryId: category.id,
      name: subcategory.name,
      color: category.color,
      icon: subcategory.icon,
      defaultPriorityId: subcategory.defaultPriorityId,
    })
    setSubcategoryDialogOpen(true)
  }

  async function updateCategory(
    category: CrmRequestCategory,
    input: { isActive?: boolean; sortOrder?: number }
  ) {
    const result = await client.requestCategories.update(category.id, input)
    if (result.error)
      showAppErrorToast(result.error, {
        title: 'Category could not be updated',
      })
    else router.refresh()
  }

  async function deleteCategory(category: CrmRequestCategory) {
    if (!window.confirm('Delete this category?')) return
    const result = await client.requestCategories.delete(category.id)
    if (result.error?.code === 'crm/category-in-use') {
      toast.error(result.error.message, {
        description: result.error.code,
        action: {
          label: 'Archive',
          onClick: () => updateCategory(category, { isActive: false }),
        },
      })
      return
    }
    if (result.error) {
      showAppErrorToast(result.error, {
        title: 'Category could not be deleted',
      })
      return
    }
    router.refresh()
  }

  async function deleteSubcategory(categoryId: string, subcategoryId: string) {
    if (!window.confirm('Delete this subcategory?')) return
    const result = await client.requestCategories.subcategories.delete(
      categoryId,
      subcategoryId
    )
    if (result.error)
      showAppErrorToast(result.error, {
        title: 'Subcategory could not be deleted',
      })
    else router.refresh()
  }

  if (categories.length === 0)
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyTitle>No categories yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/settings/categories?dialog=new"
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            Add
          </Link>
        </EmptyContent>
        <CategoryFormDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          priorities={priorities}
        />
      </Empty>
    )

  return (
    <>
      <div className="space-y-4">
        {categories.map((category) => (
          <article key={category.id} className="876-card overflow-hidden">
            <div className="flex items-start gap-3 p-5">
              <span
                className={`bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg ${categoryColorClass(category.color)}`}
              >
                <CategoryIcon name={category.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{category.name}</h2>
                  <span
                    className={`size-2 rounded-full bg-current ${categoryColorClass(category.color)}`}
                    aria-hidden="true"
                  />
                  <Badge variant={category.isActive ? 'success' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Archived'}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>
                    Team:{' '}
                    {category.defaultTeamId
                      ? (teamNames[category.defaultTeamId] ??
                        category.defaultTeamId)
                      : '—'}
                  </span>
                  <span>
                    Priority:{' '}
                    {category.defaultPriorityId
                      ? (priorityNames.get(category.defaultPriorityId) ??
                        category.defaultPriorityId)
                      : '—'}
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="icon-sm" />}
                  aria-label={`Actions for ${category.name}`}
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-44">
                  <DropdownMenuItem onClick={() => editCategory(category)}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addSubcategory(category)}>
                    <Plus className="size-4" />
                    Add subcategory
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateCategory(category, {
                        sortOrder: category.sortOrder - 1,
                      })
                    }
                  >
                    <ChevronUpIcon className="size-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateCategory(category, {
                        sortOrder: category.sortOrder + 1,
                      })
                    }
                  >
                    <ChevronDownIcon className="size-4" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      updateCategory(category, {
                        isActive: !category.isActive,
                      })
                    }
                  >
                    {category.isActive ? 'Archive' : 'Restore'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => deleteCategory(category)}
                  >
                    <Trash className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {category.subcategories.length > 0 ? (
              <ul className="divide-y border-t px-5">
                {category.subcategories.map((subcategory) => (
                  <li
                    key={subcategory.id}
                    className="flex items-center gap-3 py-2.5 pl-9"
                  >
                    <CategoryIcon
                      name={subcategory.icon ?? category.icon}
                      className={`size-3.5 ${categoryColorClass(category.color)}`}
                    />
                    <span className="flex-1 text-sm">{subcategory.name}</span>
                    {subcategory.defaultPriorityId ? (
                      <span className="text-muted-foreground text-xs">
                        {priorityNames.get(subcategory.defaultPriorityId) ??
                          subcategory.defaultPriorityId}
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Edit ${subcategory.name}`}
                      onClick={() => editSubcategory(category, subcategory)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive"
                      aria-label={`Delete ${subcategory.name}`}
                      onClick={() =>
                        deleteSubcategory(category.id, subcategory.id)
                      }
                    >
                      <Trash className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open)
          if (!open) setCategoryDraft(undefined)
        }}
        category={categoryDraft}
        priorities={priorities}
      />
      <SubcategoryFormDialog
        open={subcategoryDialogOpen}
        onOpenChange={(open) => {
          setSubcategoryDialogOpen(open)
          if (!open) setSubcategoryDraft(undefined)
        }}
        subcategory={subcategoryDraft}
        priorities={priorities}
      />
    </>
  )
}
