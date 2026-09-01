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
import { isProvisioningSetupResourceType } from '@/types/provisioning'
import {
  buildFinanceDraft,
  emptyRow,
  getResourceTypeColor,
  getResourceTypeIcon,
  financeResourceKey,
  financeResourceProperties,
  financeResourceRow,
  revisionRows,
  type FinanceCurrencyOption,
  type FinanceResourceDefinition,
  type FinanceResourceRow,
  type FinanceSelectOption,
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

type ProvisioningEditorTarget =
  | { type: 'finance'; key: string }
  | { type: 'application'; key: string; profileKey?: string }

export function FinanceProvisioningEditor({
  catalog,
  manifest: initialManifest,
  setup,
  target,
  /** When provided, locks the editor to this resource type (URL-driven tabs). */
  initialType,
  currencyOptions = [],
  languageOptions = [],
}: {
  catalog: AdminProvisioningCatalog
  manifest: AdminProvisioningManifest | null
  setup?: AdminProvisioningSetup
  target: ProvisioningEditorTarget
  initialType?: string
  currencyOptions?: readonly FinanceCurrencyOption[]
  languageOptions?: readonly FinanceSelectOption[]
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
  const [localSelectedType, setLocalSelectedType] = useState<string>(firstType)
  const selectedType = initialType ?? localSelectedType
  const isUrlDriven = initialType !== undefined

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
    setEditingRow({ ...row, values: { ...row.values } })
    setIsNewItem(false)
  }

  async function validateApplicationDraft(
    draft: Parameters<typeof client.provisioning.validate>[1]
  ) {
    if (target.type !== 'application')
      throw new Error('Application draft validation requires an app target.')

    return target.profileKey
      ? client.applicationProvisioningProfiles.validate(
          target.key,
          target.profileKey,
          draft
        )
      : client.provisioning.validate(target.key, draft)
  }

  async function saveApplicationDraft(
    draft: Parameters<typeof client.provisioning.replaceDraft>[1]
  ) {
    if (target.type !== 'application')
      throw new Error('Application draft save requires an app target.')

    return target.profileKey
      ? client.applicationProvisioningProfiles.replaceDraft(
          target.key,
          target.profileKey,
          draft
        )
      : client.provisioning.replaceDraft(target.key, draft)
  }

  async function publishApplicationDraft() {
    if (target.type !== 'application')
      throw new Error('Application publish requires an app target.')

    return target.profileKey
      ? client.applicationProvisioningProfiles.publish(
          target.key,
          target.profileKey
        )
      : client.provisioning.publish(target.key)
  }

  async function replaceRowsForApplication(
    nextRows: FinanceResourceRow[]
  ): Promise<boolean> {
    const saved = await replaceDraft('saving', nextRows)
    if (!saved) return false
    setMessage(`Draft revision ${saved.revision} saved.`)
    return true
  }

  function saveInlineItem(savedRow: FinanceResourceRow) {
    if (!activeDefinition) return

    const typeKey = getDefinitionType(activeDefinition)
    const categoryRows = groupedRows[typeKey] ?? []
    const nextRows = isNewItem
      ? [...categoryRows, savedRow]
      : categoryRows.map((row) =>
          row.localId === savedRow.localId ? savedRow : row
        )

    setMessage(null)
    startTransition(async () => {
      if (target.type === 'application') {
        if (
          !(await replaceRowsForApplication([
            ...rows.filter((row) => row.resourceType !== typeKey),
            ...nextRows,
          ]))
        )
          return
      } else if (isProvisioningSetupResourceType(typeKey)) {
        const resourceClient =
          client.provisioningSetups.resources.forType(typeKey)
        const result = isNewItem
          ? await resourceClient.create(target.key, {
              key: financeResourceKey(
                savedRow,
                activeDefinition,
                categoryRows.length
              ),
              properties: financeResourceProperties(activeDefinition, savedRow),
            })
          : await resourceClient.update(target.key, savedRow.key, {
              properties: financeResourceProperties(activeDefinition, savedRow),
            })

        if (result.error || !result.data) {
          setMessage(
            result.error?.message ?? 'Failed to save provisioning resource.'
          )
          return
        }

        const persistedRow = financeResourceRow(result.data)
        replaceType(
          typeKey,
          isNewItem
            ? [...categoryRows, persistedRow]
            : categoryRows.map((row) =>
                row.localId === savedRow.localId ? persistedRow : row
              )
        )
        setMessage(`${activeDefinition.label} saved.`)
      } else {
        setMessage('This provisioning resource type is not supported.')
        return
      }

      setEditingRow(null)
      setIsNewItem(false)
    })
  }

  function deleteInlineItem(row: FinanceResourceRow) {
    if (!activeDefinition) return

    const typeKey = getDefinitionType(activeDefinition)
    const categoryRows = groupedRows[typeKey] ?? []
    const nextRows = categoryRows.filter(
      (candidate) => candidate.localId !== row.localId
    )
    setMessage(null)

    startTransition(async () => {
      if (target.type === 'application') {
        if (
          !(await replaceRowsForApplication([
            ...rows.filter((candidate) => candidate.resourceType !== typeKey),
            ...nextRows,
          ]))
        )
          return
      } else if (isProvisioningSetupResourceType(typeKey)) {
        const result = await client.provisioningSetups.resources
          .forType(typeKey)
          .delete(target.key, row.key)
        if (result.error || !result.data) {
          setMessage(
            result.error?.message ?? 'Failed to delete provisioning resource.'
          )
          return
        }
        replaceType(typeKey, nextRows)
        setMessage(`${activeDefinition.label} deleted.`)
      } else {
        setMessage('This provisioning resource type is not supported.')
        return
      }
    })
  }

  function saveSingleton() {
    if (!activeDefinition) return

    const typeKey = getDefinitionType(activeDefinition)
    const row =
      groupedRows[typeKey]?.[0] ?? emptyRow(activeDefinition, 'default')
    const existing = groupedRows[typeKey]?.[0]
    setMessage(null)

    startTransition(async () => {
      if (target.type === 'application') {
        if (
          !(await replaceRowsForApplication([
            ...rows.filter((candidate) => candidate.resourceType !== typeKey),
            row,
          ]))
        )
          return
      } else if (isProvisioningSetupResourceType(typeKey)) {
        const resourceClient =
          client.provisioningSetups.resources.forType(typeKey)
        const result = existing
          ? await resourceClient.update(target.key, existing.key, {
              properties: financeResourceProperties(activeDefinition, row),
            })
          : await resourceClient.create(target.key, {
              key: financeResourceKey(row, activeDefinition, 0),
              properties: financeResourceProperties(activeDefinition, row),
            })
        if (result.error || !result.data) {
          setMessage(
            result.error?.message ?? 'Failed to save provisioning resource.'
          )
          return
        }
        handleSingletonChange(typeKey, financeResourceRow(result.data))
        setMessage(`${activeDefinition.label} saved.`)
      } else {
        setMessage('This provisioning resource type is not supported.')
      }
    })
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

  async function replaceDraft(
    action: 'saving' | 'publishing',
    rowsToSave = rows
  ): Promise<AdminProvisioningManifestRevision | null> {
    const draft = buildFinanceDraft(catalog, rowsToSave, currentRevision)

    if (action === 'publishing') {
      const validation =
        target.type === 'finance'
          ? await client.provisioningSetups.validate(target.key, draft)
          : await validateApplicationDraft(draft)
      if (validation.error || !validation.data) {
        setMessage(validation.error?.message ?? 'Validation failed.')
        return null
      }
      if (!validation.data.valid) {
        setIssues(validation.data.issues)
        setMessage('Resolve the validation issues before publishing.')
        return null
      }
    }

    const saved =
      target.type === 'finance'
        ? await client.provisioningSetups.replaceDraft(target.key, draft)
        : await saveApplicationDraft(draft)
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
      const saved = await replaceDraft('saving')
      if (!saved) return
      setMessage(`Draft revision ${saved.revision} saved.`)
    })
  }

  function publish() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const saved = await replaceDraft('publishing')
      if (!saved) return
      const published =
        target.type === 'finance'
          ? await client.provisioningSetups.publish(target.key)
          : await publishApplicationDraft()
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
      {!isUrlDriven && catalog.resource_types.length > 1 && (
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
                      : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      isSelected
                        ? getResourceTypeColor(typeKey)
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

      {!isWorkspace && (
        <div className="876-header-row flex shrink-0 items-center justify-between gap-2 border-b px-5 py-2">
          <div className="flex items-center gap-2">
            {message && (
              <span className="text-muted-foreground text-xs" role="status">
                {message}
              </span>
            )}
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
      )}

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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeDefinition ? (
          activeDefinition.multiple ? (
            <FinanceCollectionEditor
              definition={activeDefinition}
              rows={currentCategoryRows}
              allRows={rows}
              currencyOptions={currencyOptions}
              editingRow={editingRow}
              isNewItem={isNewItem}
              onAdd={openAddItem}
              onEdit={openEditItem}
              onEditChange={setEditingRow}
              onSave={saveInlineItem}
              onDelete={deleteInlineItem}
              onCancel={cancelInlineEdit}
              isSaving={isPending}
            />
          ) : (
            <div className={cn('p-6', isWorkspace && 'space-y-8')}>
              {isWorkspace && setup ? (
                <FinanceSetupMetadataEditor setup={setup} />
              ) : null}

              {activeDefinition.fields.length > 0 && (
                <div
                  className={cn(
                    'max-w-2xl space-y-4',
                    isWorkspace && 'border-t pt-6'
                  )}
                >
                  {isWorkspace ? (
                    <h3 className="text-foreground text-sm font-semibold">
                      Workspace defaults
                    </h3>
                  ) : null}
                  <FinanceSingletonEditor
                    definition={activeDefinition}
                    row={
                      groupedRows[activeType]?.[0] ??
                      emptyRow(activeDefinition, 'default')
                    }
                    allRows={rows}
                    languageOptions={languageOptions}
                    onChange={(nextRow) =>
                      handleSingletonChange(activeType, nextRow)
                    }
                    onSave={saveSingleton}
                    isSaving={isPending}
                  />
                </div>
              )}
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
