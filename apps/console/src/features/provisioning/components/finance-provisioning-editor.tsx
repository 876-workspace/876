'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  AdminProvisioningCatalog,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningValidation,
} from '@876/platform/compat'
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
  MoreHorizontalIcon,
  Plus,
} from '@876/ui/icons'
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
  /** When provided, locks the editor to this resource type (URL-driven tabs). */
  initialType,
}: {
  catalog: AdminProvisioningCatalog
  manifest: AdminProvisioningManifest | null
  /** `finance` targets a provisioning setup by key; `application` an app. */
  target: { type: 'finance' | 'application'; key: string }
  initialType?: string
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

  // When initialType is provided (URL-driven), that type is always active.
  // When not provided (legacy embedded mode), use local state.
  const firstType = catalog.resource_types[0]
    ? getDefinitionType(catalog.resource_types[0])
    : ''
  const [localSelectedType, setLocalSelectedType] = useState<string>(firstType)
  const selectedType = initialType ?? localSelectedType
  const isUrlDriven = initialType !== undefined

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

  if (catalog.resource_types.length === 0) {
    return (
      <div className="text-muted-foreground p-12 text-center">
        <p className="text-sm font-medium">No provisionable resources</p>
        <p className="text-muted-foreground mt-1 text-xs">
          This catalog does not define any provisionable resource types.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Internal tab strip — only shown in legacy non-URL-driven mode */}
      {!isUrlDriven && (
        <div className="border-border/80 border-b pb-px">
          <nav
            aria-label="Provisioning resource categories"
            className="no-scrollbar -mb-px flex items-center gap-1 overflow-x-auto px-6"
          >
            {catalog.resource_types.map((definition) => {
              const typeKey = getDefinitionType(definition)
              const count = groupedRows[typeKey]?.length ?? 0
              const isSelected = localSelectedType === typeKey
              const Icon = getResourceTypeIcon(typeKey)

              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setLocalSelectedType(typeKey)}
                  className={cn(
                    'group relative inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                    isSelected
                      ? 'border-foreground text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      isSelected
                        ? 'text-foreground'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span>{definition.label}</span>
                  <span
                    className={cn(
                      'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] transition-colors',
                      isSelected
                        ? 'bg-muted text-foreground font-medium'
                        : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {definition.multiple ? count : count > 0 ? '✓' : '—'}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Action toolbar */}
      <div className="border-border/50 flex shrink-0 items-center justify-between gap-3 border-b bg-transparent px-6 py-2.5">
        <div className="flex items-center gap-2">
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
              disabled={!!atMaximum}
              onClick={openAddItem}
            >
              <Plus className="size-3.5" strokeWidth={2.25} />
              <span>Add</span>
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
        <section className="border-destructive/40 bg-destructive/5 mx-6 mt-4 rounded-lg border p-4">
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
      <div className="min-h-0 flex-1 overflow-y-auto">
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
            <div className="p-6">
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
            </div>
          )
        ) : null}
      </div>

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
