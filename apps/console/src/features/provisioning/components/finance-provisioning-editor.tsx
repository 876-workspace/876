'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  AdminProvisioningCatalog,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningSetup,
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
  ArrowDownFromLine,
  ArrowUpFromLine,
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
import { FinanceSetupMetadataEditor } from './finance-setup-metadata-editor'
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
  setup,
  target,
  /** When provided, locks the editor to this resource type (URL-driven tabs). */
  initialType,
}: {
  catalog: AdminProvisioningCatalog
  manifest: AdminProvisioningManifest | null
  setup?: AdminProvisioningSetup
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

  // Collection items edit directly in their table row.
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

  const activeType = activeDefinition ? getDefinitionType(activeDefinition) : ''
  const isWorkspace = activeType === 'workspace'
  const currentCategoryRows = activeDefinition
    ? (groupedRows[activeType] ?? [])
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

    setEditingRow(emptyRow(activeDefinition, newId()))
    setIsNewItem(true)
  }

  function openEditItem(row: FinanceResourceRow) {
    setEditingRow({
      ...row,
      values: { ...row.values },
    })
    setIsNewItem(false)
  }

  function saveInlineItem(savedRow: FinanceResourceRow) {
    if (!activeDefinition) return

    const typeKey = getDefinitionType(activeDefinition)
    const categoryRows = groupedRows[typeKey] ?? []

    if (isNewItem) {
      replaceType(typeKey, [...categoryRows, savedRow])
    } else {
      replaceType(
        typeKey,
        categoryRows.map((row) =>
          row.localId === savedRow.localId ? savedRow : row
        )
      )
    }

    setEditingRow(null)
    setIsNewItem(false)
  }

  function cancelInlineEdit() {
    setEditingRow(null)
    setIsNewItem(false)
  }

  function discardChanges() {
    setRows(revisionRows(currentRevision))
    setEditingRow(null)
    setIsNewItem(false)
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
                  onClick={() => {
                    cancelInlineEdit()
                    setLocalSelectedType(typeKey)
                  }}
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

      {/* Resource heading + actions */}
      <div className="876-header-row flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
        <div className="min-w-0">
          <h3 className="text-foreground truncate text-sm font-semibold">
            {activeDefinition?.label}
          </h3>
          {activeDefinition?.description ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {activeDefinition.description}
            </p>
          ) : null}
          {message ? (
            <p className="text-muted-foreground mt-1 text-xs" role="status">
              {message}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {activeDefinition?.multiple && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!atMaximum || editingRow !== null}
              onClick={openAddItem}
            >
              <Plus className="size-3.5" strokeWidth={2.25} />
              Add
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' })
              )}
              aria-label="More provisioning actions"
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                disabled={isPending || editingRow !== null}
                onClick={save}
              >
                Save draft
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isPending || editingRow !== null}
                onClick={publish}
              >
                Publish
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <ArrowUpFromLine className="size-4" />
                Import...
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <ArrowDownFromLine className="size-4" />
                Export...
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
                <span className="font-mono">{issue.path}</span>: {issue.message}
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
              allRows={rows}
              editingRow={editingRow}
              isNewItem={isNewItem}
              onChange={(next) => replaceType(activeType, next)}
              onAdd={openAddItem}
              onEdit={openEditItem}
              onEditChange={setEditingRow}
              onSave={saveInlineItem}
              onCancel={cancelInlineEdit}
            />
          ) : (
            <div className="space-y-6 p-6">
              {isWorkspace && setup ? (
                <FinanceSetupMetadataEditor setup={setup} />
              ) : null}

              {isWorkspace && setup ? (
                <div className="max-w-2xl">
                  <h4 className="text-foreground text-sm font-semibold">
                    Workspace defaults
                  </h4>
                  <p className="text-muted-foreground mt-1 mb-3 text-xs">
                    Locale and currency values applied inside each finance
                    workspace created from this setup.
                  </p>
                </div>
              ) : null}

              <FinanceSingletonEditor
                definition={activeDefinition}
                row={
                  groupedRows[activeType]?.[0] ??
                  emptyRow(activeDefinition, 'default')
                }
                allRows={rows}
                onChange={(nextRow) =>
                  handleSingletonChange(activeType, nextRow)
                }
              />
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
