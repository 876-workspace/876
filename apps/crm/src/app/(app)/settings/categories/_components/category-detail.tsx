'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  CategoryIcon,
  isCategoryIconKey,
  type CategoryIconKey,
} from '@876/ui/category-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { FormRow, FormRowGroup } from '@876/ui/form-row'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MoreHorizontalIcon,
  Pencil,
  Plus,
  Trash,
  XIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Switch } from '@876/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type {
  CrmRequestCategory,
  CrmRequestSubcategory,
  RequestPriority,
} from '@/types/crm'

import { CategoryActivity } from './category-activity'
import {
  CategoryColorPicker,
  getCategoryColorVariant,
} from './category-color-picker'
import { CategoryIconPicker } from './category-icon-picker'
import {
  SubcategoryFormDialog,
  type SubcategoryDraft,
} from './subcategory-form-dialog'

const DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'subcategories', label: 'Subcategories' },
  { value: 'activity', label: 'Activity' },
] as const

type TabValue = (typeof DETAIL_TABS)[number]['value']
type ErrorValue = { code: string; message: string }

type Props = {
  category: CrmRequestCategory
  priorities: RequestPriority[]
  teamNames: Record<string, string>
  onClose: () => void
  className?: string
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function CategoryDetail({
  category,
  priorities,
  teamNames,
  onClose,
  className,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabValue>('overview')

  // Overview form state
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description ?? '')
  const [color, setColor] = useState(category.color ?? 'blue')
  const [icon, setIcon] = useState<CategoryIconKey>(
    isCategoryIconKey(category.icon) ? category.icon : 'tag'
  )
  const [defaultTeamId, setDefaultTeamId] = useState(
    category.defaultTeamId ?? ''
  )
  const [defaultPriorityId, setDefaultPriorityId] = useState(
    category.defaultPriorityId ?? ''
  )
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder))
  const [isActive, setIsActive] = useState(category.isActive)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [archiveCandidate, setArchiveCandidate] = useState(false)

  // Subcategory dialog state
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false)
  const [subcategoryDraft, setSubcategoryDraft] = useState<SubcategoryDraft>()

  const colorVariant = getCategoryColorVariant(color)
  const availablePriorities = priorities.filter(
    (p) => p.isActive || p.id === defaultPriorityId
  )
  const priorityNames = new Map(
    priorities.map((priority) => [priority.id, priority.name])
  )
  const teamOptions = Object.entries(teamNames).map(([id, teamName]) => ({
    id,
    name: teamName,
  }))

  const subcategories = category.subcategories ?? []

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const normalizedName = name.trim()
    if (!normalizedName) {
      setNameError('Name is required.')
      return
    }

    const parsedSortOrder = Number(sortOrder)
    if (!Number.isInteger(parsedSortOrder)) {
      setError({
        code: 'crm/invalid-sort-order',
        message: 'Sort order must be a valid integer.',
      })
      return
    }

    setSaving(true)
    setError(null)
    setNameError(null)

    const result = await client.requestCategories.update(category.id, {
      name: normalizedName,
      description: description.trim() || null,
      color,
      icon,
      defaultTeamId: defaultTeamId || null,
      defaultPriorityId: defaultPriorityId || null,
      sortOrder: parsedSortOrder,
      isActive,
    })

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    toast.success('Category saved.')
    router.refresh()
  }

  async function toggleStatus() {
    if (changingStatus) return
    setChangingStatus(true)
    setError(null)
    const nextStatus = !category.isActive
    const result = await client.requestCategories.update(category.id, {
      isActive: nextStatus,
    })
    setChangingStatus(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    setIsActive(nextStatus)
    toast.success(nextStatus ? 'Category restored.' : 'Category archived.')
    router.refresh()
  }

  async function handleDelete() {
    if (deleting) return
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    setDeleting(true)
    setError(null)
    setArchiveCandidate(false)
    const result = await client.requestCategories.delete(category.id)
    setDeleting(false)

    if (result.error?.code === 'crm/category-in-use') {
      setError(result.error)
      setArchiveCandidate(true)
      return
    }
    if (result.error) {
      setError(result.error)
      return
    }

    toast.success('Category deleted.')
    onClose()
    router.refresh()
  }

  function addSubcategory() {
    setSubcategoryDraft({
      categoryId: category.id,
      name: '',
      color: category.color,
      icon: category.icon,
      defaultPriorityId: null,
    })
    setSubcategoryDialogOpen(true)
  }

  function editSubcategory(subcategory: CrmRequestSubcategory) {
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

  async function deleteSubcategory(subcategoryId: string) {
    if (!window.confirm('Delete this subcategory?')) return
    const result = await client.requestCategories.subcategories.delete(
      category.id,
      subcategoryId
    )
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success('Subcategory deleted.')
    router.refresh()
  }

  async function updateSubcategoryOrder(
    subcategory: CrmRequestSubcategory,
    delta: number
  ) {
    const result = await client.requestCategories.subcategories.update(
      category.id,
      subcategory.id,
      { sortOrder: subcategory.sortOrder + delta }
    )
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    router.refresh()
  }

  return (
    <>
      <section
        className={cn(
          '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <header className="border-876-surface-border flex shrink-0 items-start gap-3.5 border-b px-6 py-5">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl border',
              colorVariant.bg,
              colorVariant.text,
              colorVariant.border
            )}
          >
            <CategoryIcon name={icon} className="size-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
                {name.trim() || category.name}
              </h2>
              <Badge variant={isActive ? 'success' : 'secondary'}>
                {isActive ? 'Active' : 'Archived'}
              </Badge>
              {category.provisioningKey ? (
                <Badge variant="secondary">Provisioned</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {subcategories.length === 0
                ? 'No subcategories'
                : subcategories.length === 1
                  ? '1 subcategory'
                  : `${subcategories.length} subcategories`}
              {category.defaultTeamId && teamNames[category.defaultTeamId]
                ? ` · ${teamNames[category.defaultTeamId]}`
                : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="icon-sm" />}
                aria-label="More category actions"
              >
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-44">
                <DropdownMenuItem
                  onClick={toggleStatus}
                  disabled={changingStatus}
                >
                  {isActive ? 'Archive' : 'Restore'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close category details"
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </header>

        {/* Tabs Bar */}
        <div
          role="tablist"
          aria-label="Category details"
          className="border-876-surface-border shrink-0 border-b px-6 pt-3.5 pb-3"
        >
          <div className="bg-muted/60 inline-flex w-fit items-center gap-1 rounded-lg p-1">
            {DETAIL_TABS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={tab === entry.value}
                onClick={() => setTab(entry.value)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors',
                  tab === entry.value
                    ? 'text-foreground bg-background shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {entry.label}
                {entry.value === 'subcategories' && subcategories.length > 0 ? (
                  <span className="text-muted-foreground bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-[0.625rem]">
                    {subcategories.length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Panels */}
        <div
          key={tab}
          role="tabpanel"
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 min-h-0 flex-1 overflow-y-auto motion-safe:duration-150 motion-safe:ease-out"
        >
          {tab === 'overview' && (
            <form
              onSubmit={submit}
              className="flex min-h-full flex-col"
              noValidate
            >
              <div className="flex-1 space-y-5 p-6">
                <FormRow
                  htmlFor="edit-category-name"
                  label="Name"
                  required
                  className={rowClassName}
                >
                  <div className="space-y-1.5">
                    <Input
                      id="edit-category-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value)
                        if (nameError) setNameError(null)
                      }}
                      disabled={saving}
                      aria-invalid={Boolean(nameError)}
                      required
                    />
                    {nameError ? (
                      <p className="text-destructive text-xs" role="alert">
                        {nameError}
                      </p>
                    ) : null}
                  </div>
                </FormRow>

                <FormRow label="Icon & colour" className={rowClassName}>
                  <FormRowGroup>
                    <CategoryIconPicker
                      value={icon}
                      onChange={setIcon}
                      disabled={saving}
                    />
                    <div className="pt-1">
                      <CategoryColorPicker
                        value={color}
                        onChange={setColor}
                        disabled={saving}
                      />
                    </div>
                  </FormRowGroup>
                </FormRow>

                <FormRow
                  htmlFor="edit-category-description"
                  label="Description"
                  hint="A short description of requests in this category."
                  className={rowClassName}
                >
                  <Textarea
                    id="edit-category-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={saving}
                    rows={3}
                  />
                </FormRow>

                <FormRow
                  label="Default team"
                  hint="Team assigned by default when this category is selected."
                  className={rowClassName}
                >
                  <Select
                    value={defaultTeamId || 'none'}
                    onValueChange={(val) =>
                      setDefaultTeamId(val === 'none' ? '' : (val ?? ''))
                    }
                    disabled={saving}
                  >
                    <SelectTrigger aria-label="Default team" className="w-full">
                      <SelectValue placeholder="No default team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default team</SelectItem>
                      {teamOptions.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>

                <FormRow
                  label="Default priority"
                  hint="Priority set by default when this category is selected."
                  className={rowClassName}
                >
                  <Select
                    value={defaultPriorityId || 'none'}
                    onValueChange={(val) =>
                      setDefaultPriorityId(val === 'none' ? '' : (val ?? ''))
                    }
                    disabled={saving}
                  >
                    <SelectTrigger
                      aria-label="Default priority"
                      className="w-full"
                    >
                      <SelectValue placeholder="No default priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default priority</SelectItem>
                      {availablePriorities.map((priority) => (
                        <SelectItem key={priority.id} value={priority.id}>
                          {priority.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>

                <FormRow
                  htmlFor="edit-category-sort-order"
                  label="Sort order"
                  className={rowClassName}
                >
                  <Input
                    id="edit-category-sort-order"
                    type="number"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    disabled={saving}
                  />
                </FormRow>

                <FormRow label="Active" className={rowClassName}>
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      id="edit-category-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      disabled={saving}
                    />
                    <Label htmlFor="edit-category-active" className="mb-0">
                      Active category
                    </Label>
                  </div>
                </FormRow>

                {error ? (
                  <AppError
                    title="Category could not be updated"
                    error={error}
                    variant="form"
                    action={
                      archiveCandidate ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleStatus()}
                        >
                          Archive instead
                        </Button>
                      ) : undefined
                    }
                  />
                ) : null}
              </div>

              <div className="border-876-surface-border flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="info" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          )}

          {tab === 'subcategories' && (
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground text-[0.8125rem] font-semibold">
                  Subcategories
                </h3>
                <Button
                  type="button"
                  variant="info"
                  size="sm"
                  onClick={addSubcategory}
                >
                  <Plus className="size-3.5" />
                  Add subcategory
                </Button>
              </div>

              <div className="border-876-surface-border overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader className="876-header-row">
                    <TableRow>
                      <TableHead className="px-4 py-3 text-[0.8125rem] font-semibold">
                        Subcategory
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[0.8125rem] font-semibold">
                        Priority
                      </TableHead>
                      <TableHead className="w-20 px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subcategories.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-muted-foreground py-8 text-center text-xs"
                        >
                          No subcategories added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      subcategories.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <CategoryIcon
                                name={sub.icon ?? icon}
                                className={cn('size-3.5', colorVariant.text)}
                              />
                              <span className="text-foreground text-[0.8125rem] font-medium">
                                {sub.name}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground px-4 py-3 text-[0.8125rem]">
                            {sub.defaultPriorityId
                              ? (priorityNames.get(sub.defaultPriorityId) ??
                                sub.defaultPriorityId)
                              : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Move up ${sub.name}`}
                                onClick={() => updateSubcategoryOrder(sub, -1)}
                              >
                                <ChevronUpIcon className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Move down ${sub.name}`}
                                onClick={() => updateSubcategoryOrder(sub, 1)}
                              >
                                <ChevronDownIcon className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Edit ${sub.name}`}
                                onClick={() => editSubcategory(sub)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Delete ${sub.name}`}
                                onClick={() => deleteSubcategory(sub.id)}
                              >
                                <Trash className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="p-6">
              <CategoryActivity category={category} />
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-muted-foreground/70 border-876-surface-border shrink-0 truncate border-t px-6 py-3 font-mono text-[0.6875rem]">
          {category.id}
        </p>
      </section>

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
