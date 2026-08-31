'use client'

import { useMemo, useState, useSyncExternalStore, useTransition } from 'react'
import type {
  AdminProvisioningCatalog,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningValidation,
} from '@876/platform/compat'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontalIcon,
  Plus,
  ReceiptText,
} from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import { cn } from '@876/core/utils'

import { client } from '@/lib/client'
import {
  buildFinanceDraft,
  emptyRow,
  getResourceTypeIcon,
  revisionRows,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
} from '../finance-provisioning-utils'
import { FinanceCollectionEditor } from './finance-collection-editor'
import { FinanceResourceDrawer } from './finance-resource-drawer'
import { FinanceSingletonEditor } from './finance-singleton-editor'

const RESOURCE_TYPE_ICON_COLORS: Record<string, string> = {
  workspace: 'text-blue-500 dark:text-blue-400',
  currency: 'text-emerald-500 dark:text-emerald-400',
  payment_mode: 'text-purple-500 dark:text-purple-400',
  payment_term: 'text-amber-500 dark:text-amber-400',
  invoice_preference: 'text-indigo-500 dark:text-indigo-400',
  tax_authority: 'text-rose-500 dark:text-rose-400',
  tax_rate: 'text-orange-500 dark:text-orange-400',
  document_preference: 'text-teal-500 dark:text-teal-400',
  organization_profile: 'text-sky-500 dark:text-sky-400',
}

function getResourceTypeIconColor(resourceType: string): string {
  return (
    RESOURCE_TYPE_ICON_COLORS[resourceType] ??
    'text-slate-500 dark:text-slate-400'
  )
}

const STORAGE_KEY = '876_provisioning_sidebar_collapsed'

const collapseListeners = new Set<() => void>()

function subscribeToCollapsed(onChange: () => void) {
  collapseListeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    collapseListeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // Ignore local storage errors
  }
  for (const listener of collapseListeners) listener()
}

function getDefinitionType(definition: FinanceResourceDefinition): string {
  return (
    definition.resource_type ||
    (definition as { resourceType?: string }).resourceType ||
    ''
  )
}

function newId() {
  return `new-${crypto.randomUUID()}`
}

export function FinanceProvisioningEditor({
  catalog,
  manifest: initialManifest,
  target,
}: {
  catalog: AdminProvisioningCatalog
  manifest: AdminProvisioningManifest | null
  /** `finance` targets a provisioning setup by key; `application` an app. */
  target: { type: 'finance' | 'application'; key: string }
  heading?: string
  description?: string
}) {
  const isCollapsed = useSyncExternalStore(
    subscribeToCollapsed,
    readCollapsed,
    () => true
  )

  const handleToggle = writeCollapsed
  const initialRevision =
    initialManifest?.draft ?? initialManifest?.published ?? null
  const [draftRevision, setDraftRevision] =
    useState<AdminProvisioningManifestRevision | null>(
      initialManifest?.draft ?? null
    )
  const [publishedRevision, setPublishedRevision] =
    useState<AdminProvisioningManifestRevision | null>(
      initialManifest?.published ?? null
    )
  const [rows, setRows] = useState<FinanceResourceRow[]>(() =>
    revisionRows(initialRevision)
  )
  const [issues, setIssues] = useState<AdminProvisioningValidation['issues']>(
    []
  )
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const firstType = catalog.resource_types[0]
    ? getDefinitionType(catalog.resource_types[0])
    : ''
  const [selectedType, setSelectedType] = useState<string>(firstType)

  // Drawer state for adding / editing collection items
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<FinanceResourceRow | null>(null)
  const [isNewItem, setIsNewItem] = useState(false)

  const currentRevision = draftRevision ?? publishedRevision

  const groupedRows = useMemo(
    () =>
      Object.fromEntries(
        catalog.resource_types.map((definition) => {
          const typeKey = getDefinitionType(definition)
          return [typeKey, rows.filter((row) => row.resourceType === typeKey)]
        })
      ),
    [catalog.resource_types, rows]
  )

  const activeDefinition = useMemo(
    () =>
      catalog.resource_types.find(
        (def) => getDefinitionType(def) === selectedType
      ) ?? catalog.resource_types[0],
    [catalog.resource_types, selectedType]
  )

  const currentCategoryRows = activeDefinition
    ? (groupedRows[getDefinitionType(activeDefinition)] ?? [])
    : []

  const atMaximum =
    activeDefinition &&
    activeDefinition.maximum_items !== null &&
    currentCategoryRows.length >= activeDefinition.maximum_items

  function replaceType(resourceType: string, next: FinanceResourceRow[]) {
    setRows((current) => [
      ...current.filter((row) => row.resourceType !== resourceType),
      ...next,
    ])
  }

  function handleSingletonChange(
    resourceType: string,
    nextRow: FinanceResourceRow
  ) {
    setRows((current) => {
      const filtered = current.filter((r) => r.resourceType !== resourceType)
      return [...filtered, nextRow]
    })
  }

  function openAddItem() {
    if (!activeDefinition) return
    const row = emptyRow(activeDefinition, newId())
    setEditingRow(row)
    setIsNewItem(true)
    setDrawerOpen(true)
  }

  function openEditItem(row: FinanceResourceRow) {
    setEditingRow(row)
    setIsNewItem(false)
    setDrawerOpen(true)
  }

  function saveDrawerItem(savedRow: FinanceResourceRow) {
    if (!activeDefinition) return
    const typeKey = getDefinitionType(activeDefinition)
    const categoryRows = groupedRows[typeKey] ?? []

    if (isNewItem) {
      replaceType(typeKey, [...categoryRows, savedRow])
    } else {
      replaceType(
        typeKey,
        categoryRows.map((r) => (r.localId === savedRow.localId ? savedRow : r))
      )
    }

    setDrawerOpen(false)
    setEditingRow(null)
  }

  function discardChanges() {
    setRows(revisionRows(currentRevision))
    setIssues([])
    setMessage('Changes reverted.')
  }

  async function replaceValidatedDraft(
    action: 'saving' | 'publishing'
  ): Promise<AdminProvisioningManifestRevision | null> {
    const draft = buildFinanceDraft(catalog, rows, currentRevision)
    const validation =
      target.type === 'finance'
        ? await client.provisioningSetups.validate(target.key, draft)
        : await client.provisioning.validate(target.key, draft)
    if (validation.error || !validation.data) {
      setMessage(
        validation.error?.message ??
          (action === 'saving'
            ? 'Failed to validate finance defaults.'
            : 'Validation failed.')
      )
      return null
    }
    if (!validation.data.valid) {
      setIssues(validation.data.issues)
      setMessage(
        `Resolve the validation issues before ${action === 'saving' ? 'saving' : 'publishing'}.`
      )
      return null
    }
    const saved =
      target.type === 'finance'
        ? await client.provisioningSetups.replaceDraft(target.key, draft)
        : await client.provisioning.replaceDraft(target.key, draft)
    if (saved.error || !saved.data) {
      setMessage(saved.error?.message ?? 'Failed to save finance defaults.')
      return null
    }
    setDraftRevision(saved.data)
    setRows(revisionRows(saved.data))
    return saved.data
  }

  function save() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const saved = await replaceValidatedDraft('saving')
      if (!saved) return
      setDraftRevision(saved)
      setRows(revisionRows(saved))
      setMessage(`Draft revision ${saved.revision} saved.`)
    })
  }

  function publish() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const saved = await replaceValidatedDraft('publishing')
      if (!saved) return
      const published =
        target.type === 'finance'
          ? await client.provisioningSetups.publish(target.key)
          : await client.provisioning.publish(target.key)
      if (published.error || !published.data) {
        setMessage(
          published.error?.message ?? 'Failed to publish finance defaults.'
        )
        return
      }
      setDraftRevision(null)
      setPublishedRevision(published.data)
      setRows(revisionRows(published.data))
      setMessage(
        `Revision ${published.data.revision} published for future organizations.`
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* 2-Column Master-Detail Layout */}
      {catalog.resource_types.length === 0 ? (
        <div className="text-muted-foreground p-12 text-center">
          <p className="text-sm font-medium">No provisionable resources</p>
          <p className="text-muted-foreground mt-1 text-xs">
            This catalog does not define any provisionable resource types.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Left Category Navigation Sidebar */}
          {isCollapsed ? (
            <aside className="w-12 shrink-0 transition-[width] duration-200 ease-in-out sm:w-14">
              <div className="border-border/80 bg-background/90 dark:bg-sidebar/90 sticky top-4 flex w-full flex-col items-center gap-1 rounded-2xl border p-1.5 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl transition-all duration-200 dark:shadow-black/25 dark:ring-white/[0.06]">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => handleToggle(false)}
                        aria-label="Expand categories sidebar"
                        className="group/btn hover:bg-muted/80 relative flex size-8 items-center justify-center rounded-xl transition-all duration-150"
                      >
                        <span className="bg-muted text-muted-foreground border-border/50 flex size-5.5 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
                          <ReceiptText className="size-3 text-emerald-500 dark:text-emerald-400" />
                        </span>
                        <span className="bg-background/95 dark:bg-sidebar/95 border-border/60 absolute inset-0 flex items-center justify-center rounded-xl border opacity-0 shadow-2xs transition-opacity duration-150 group-hover/btn:opacity-100">
                          <ChevronRight className="text-foreground size-3.5" />
                        </span>
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={8}>
                    Expand sidebar
                  </TooltipContent>
                </Tooltip>

                <div className="bg-border/60 my-0.5 h-px w-4" />

                <nav
                  aria-label="Provisioning resource categories"
                  className="flex flex-col items-center gap-1"
                >
                  {catalog.resource_types.map((definition) => {
                    const typeKey = getDefinitionType(definition)
                    const count = groupedRows[typeKey]?.length ?? 0
                    const isSelected = selectedType === typeKey
                    const Icon = getResourceTypeIcon(typeKey)
                    const colorClass = getResourceTypeIconColor(typeKey)

                    return (
                      <Tooltip key={typeKey}>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              onClick={() => setSelectedType(typeKey)}
                              aria-label={definition.label}
                              className={cn(
                                'group relative flex size-8 items-center justify-center rounded-xl transition-all duration-150',
                                isSelected
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'size-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                                  colorClass
                                )}
                              />
                            </button>
                          }
                        />
                        <TooltipContent side="right" sideOffset={8}>
                          <div className="flex items-center gap-1.5">
                            <span>{definition.label}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              {definition.multiple
                                ? count
                                : count > 0
                                  ? '✓'
                                  : '—'}
                            </span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </nav>
              </div>
            </aside>
          ) : (
            <aside className="w-48 shrink-0 transition-[width] duration-200 ease-in-out sm:w-52">
              <div className="border-border/80 bg-background/90 dark:bg-sidebar/90 sticky top-4 flex w-full flex-col gap-1.5 rounded-2xl border p-2.5 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl transition-all duration-200 dark:shadow-black/25 dark:ring-white/[0.06]">
                <div className="flex items-center justify-between px-1 py-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="bg-muted text-muted-foreground border-border/50 flex size-5.5 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
                      <ReceiptText className="size-3 text-emerald-500 dark:text-emerald-400" />
                    </span>
                    <span className="text-muted-foreground truncate text-[11px] font-semibold tracking-wider uppercase">
                      Categories
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => handleToggle(true)}
                          aria-label="Collapse to floating rail"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors"
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                      }
                    />
                    <TooltipContent side="bottom" sideOffset={4}>
                      Collapse to floating rail
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="bg-border/60 my-0.5 h-px w-full" />

                <nav
                  aria-label="Provisioning resource categories"
                  className="flex flex-col gap-0.5"
                >
                  {catalog.resource_types.map((definition) => {
                    const typeKey = getDefinitionType(definition)
                    const count = groupedRows[typeKey]?.length ?? 0
                    const isSelected = selectedType === typeKey
                    const Icon = getResourceTypeIcon(typeKey)
                    const colorClass = getResourceTypeIconColor(typeKey)

                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setSelectedType(typeKey)}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs'
                            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon
                            className={cn(
                              'size-3.5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                              colorClass
                            )}
                          />
                          <span className="truncate">{definition.label}</span>
                        </div>
                        <span
                          className={cn(
                            'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[0.625rem] font-medium',
                            isSelected
                              ? 'bg-sidebar-accent-foreground/15 text-sidebar-accent-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {definition.multiple ? count : count > 0 ? '✓' : '—'}
                        </span>
                      </button>
                    )
                  })}
                </nav>
              </div>
            </aside>
          )}

          {/* Right Main Content: Condensed Header toolbar + Standard Data Table / Singleton Form */}
          <main className="min-w-0 space-y-4">
            {/* Condensed Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {activeDefinition && (
                  <h2 className="876-page-title text-foreground">
                    {activeDefinition.label}
                  </h2>
                )}
                {draftRevision && (
                  <Badge variant="warning">
                    Draft v{draftRevision.revision}
                  </Badge>
                )}
                {publishedRevision && !draftRevision && (
                  <Badge variant="outline">
                    Published v{publishedRevision.revision}
                  </Badge>
                )}
                {message && (
                  <span className="text-muted-foreground text-xs" role="status">
                    {message}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeDefinition?.multiple && (
                  <Button
                    variant="info"
                    size="sm"
                    disabled={atMaximum}
                    onClick={openAddItem}
                  >
                    <Plus className="size-4" strokeWidth={2.25} />
                    <span className="hidden md:inline">Add</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={publish}
                >
                  Publish
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'icon-sm' })
                    )}
                    aria-label="More provisioning actions"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem disabled={isPending} onClick={save}>
                      Save draft
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isPending}
                      onClick={discardChanges}
                    >
                      Reset changes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Validation Issues Alert (if any) */}
            {issues.length > 0 && (
              <section className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-destructive size-4 shrink-0" />
                  <p className="text-destructive text-[0.8125rem] font-medium">
                    {issues.length} validation{' '}
                    {issues.length === 1 ? 'issue' : 'issues'} detected
                  </p>
                </div>
                <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-xs">
                  {issues.map((issue) => (
                    <li key={`${issue.path}-${issue.code}`}>
                      <span className="font-mono">{issue.path}</span>:{' '}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Standard Data Table or Singleton Form */}
            {activeDefinition ? (
              activeDefinition.multiple ? (
                <FinanceCollectionEditor
                  definition={activeDefinition}
                  rows={currentCategoryRows}
                  onChange={(next) =>
                    replaceType(getDefinitionType(activeDefinition), next)
                  }
                  onAdd={openAddItem}
                  onEdit={openEditItem}
                />
              ) : (
                <FinanceSingletonEditor
                  definition={activeDefinition}
                  row={
                    groupedRows[getDefinitionType(activeDefinition)]?.[0] ??
                    emptyRow(activeDefinition, 'default')
                  }
                  allRows={rows}
                  onChange={(nextRow) =>
                    handleSingletonChange(
                      getDefinitionType(activeDefinition),
                      nextRow
                    )
                  }
                />
              )
            ) : null}
          </main>
        </div>
      )}

      {/* Slide-over Item Drawer */}
      {activeDefinition && (
        <FinanceResourceDrawer
          open={drawerOpen}
          definition={activeDefinition}
          row={editingRow}
          allRows={rows}
          isNew={isNewItem}
          onSave={saveDrawerItem}
          onClose={() => {
            setDrawerOpen(false)
            setEditingRow(null)
          }}
        />
      )}
    </div>
  )
}
