'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  AdminProvisioningCatalog,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningValidation,
} from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { AlertCircle, MoreHorizontalIcon, Plus } from '@876/ui/icons'
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
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
          {/* Left Category Navigation Rail */}
          <nav
            aria-label="Provisioning resource categories"
            className="flex flex-col gap-1 pr-2"
          >
            {catalog.resource_types.map((definition) => {
              const typeKey = getDefinitionType(definition)
              const count = groupedRows[typeKey]?.length ?? 0
              const isSelected = selectedType === typeKey
              const Icon = getResourceTypeIcon(typeKey)

              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setSelectedType(typeKey)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-[var(--876-nav-active-bg)] font-medium text-[var(--876-nav-active-fg)]'
                      : 'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-white/75 dark:hover:bg-white/8'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{definition.label}</span>
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-medium',
                      isSelected
                        ? 'bg-[var(--876-nav-active-fg)]/15 text-[var(--876-nav-active-fg)]'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {definition.multiple ? count : count > 0 ? '✓' : '—'}
                  </span>
                </button>
              )
            })}
          </nav>

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
                    Add
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
