'use client'

import { useState, useTransition } from 'react'
import type { AdminApplicationModule } from '@876/platform/compat'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Skeleton } from '@876/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { Pencil, Plus, Trash } from '@876/ui/icons'

import { useAsyncValue } from '@/hooks/use-async-value'
import { client } from '@/lib/client'

export type ModuleFeatureOption = { id: string; name: string; slug: string }
export type ModulesContext = { appId: string; canManage: boolean }

type Draft = {
  key: string
  name: string
  description: string
  featureId: string
  position: string
}

const emptyDraft: Draft = {
  key: '',
  name: '',
  description: '',
  featureId: '',
  position: '0',
}

export function ModulesManager({
  context,
  modules,
  features,
}: {
  context: ModulesContext | Promise<ModulesContext>
  modules: AdminApplicationModule[] | Promise<AdminApplicationModule[]>
  features: ModuleFeatureOption[] | Promise<ModuleFeatureOption[]>
}) {
  const contextState = useAsyncValue(context)
  const modulesState = useAsyncValue(modules)
  const featuresState = useAsyncValue(features)
  const [localModules, setLocalModules] = useState<
    AdminApplicationModule[] | null
  >(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const appId = contextState.value?.appId ?? null
  const canManage = contextState.value?.canManage ?? false
  const resolvedModules = localModules ?? modulesState.value ?? []
  const resolvedFeatures = featuresState.value ?? []

  function edit(module: AdminApplicationModule) {
    setEditingId(module.id)
    setDraft({
      key: module.key,
      name: module.name,
      description: module.description ?? '',
      featureId: module.feature_id ?? '',
      position: String(module.position),
    })
  }

  function save() {
    if (
      !appId ||
      !editingId ||
      !draft.name.trim() ||
      modulesState.pending ||
      (editingId === 'new' && !draft.key.trim())
    )
      return

    const targetId = editingId
    setMessage(null)
    startTransition(async () => {
      const position = Number.parseInt(draft.position || '0', 10)
      const result =
        targetId === 'new'
          ? await client.modules.create({
              app_id: appId,
              key: draft.key.trim(),
              name: draft.name.trim(),
              description: draft.description.trim() || null,
              feature_id: draft.featureId || null,
              position: Number.isFinite(position) ? position : 0,
            })
          : await client.modules.update(targetId, {
              name: draft.name.trim(),
              description: draft.description.trim() || null,
              feature_id: draft.featureId || null,
              position: Number.isFinite(position) ? position : 0,
            })
      if (result.error || !result.data) {
        setMessage(result.error?.message ?? 'Failed to save module.')
        return
      }
      setLocalModules((current) => {
        const base = current ?? modulesState.value ?? []
        const exists = base.some((item) => item.id === result.data!.id)
        return exists
          ? base.map((item) =>
              item.id === result.data!.id ? result.data! : item
            )
          : [...base, result.data!]
      })
      setEditingId(null)
      setDraft(emptyDraft)
      setMessage('Module saved.')
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="876-eyebrow">
            {contextState.pending
              ? 'Product structure'
              : canManage
                ? 'Product structure'
                : 'Platform structure'}
          </p>
          <h1 className="876-page-title mt-1">Modules</h1>
        </div>
        {canManage ? (
          <Button
            size="sm"
            onClick={() => {
              setEditingId('new')
              setDraft(emptyDraft)
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        ) : contextState.pending ? (
          <Skeleton className="h-8 w-16" />
        ) : null}
      </div>

      {contextState.error ? (
        <InlineError message={contextState.error.message} />
      ) : null}

      {modulesState.pending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : modulesState.error ? (
        <InlineError message={modulesState.error.message} />
      ) : (
        <div className="876-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Rollout flag</TableHead>
                <TableHead>Status</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolvedModules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>
                    <p className="font-medium">{module.name}</p>
                    <p className="text-muted-foreground max-w-md text-xs">
                      {module.description || 'No description'}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {module.key}
                  </TableCell>
                  <TableCell>{module.feature_slug || 'None'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        module.status === 'active' ? 'success' : 'secondary'
                      }
                    >
                      {module.status}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={`Edit ${module.name}`}
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => edit(module)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Archive ${module.name}`}
                          size="icon-sm"
                          variant="ghost"
                          disabled={module.status === 'archived' || isPending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await client.modules.archive(
                                module.id
                              )
                              if (!result.error)
                                setLocalModules((current) => {
                                  const base =
                                    current ?? modulesState.value ?? []
                                  return base.map((item) =>
                                    item.id === module.id
                                      ? { ...item, status: 'archived' }
                                      : item
                                  )
                                })
                            })
                          }
                        >
                          <Trash className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingId && (
        <ModuleForm
          draft={draft}
          features={resolvedFeatures}
          featuresPending={featuresState.pending}
          featuresError={featuresState.error?.message ?? null}
          isNew={editingId === 'new'}
          onChange={setDraft}
        />
      )}
      {editingId && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
          <Button
            disabled={
              isPending ||
              contextState.pending ||
              modulesState.pending ||
              !appId
            }
            onClick={save}
          >
            Save module
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-[0.8125rem]" role="status">
        {message}
      </p>
    </div>
  )
}

function ModuleForm({
  draft,
  features,
  featuresPending,
  featuresError,
  isNew,
  onChange,
}: {
  draft: Draft
  features: ModuleFeatureOption[]
  featuresPending: boolean
  featuresError: string | null
  isNew: boolean
  onChange: (draft: Draft) => void
}) {
  return (
    <section className="876-card grid gap-4 p-5 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="module-key">Stable key</Label>
        <Input
          id="module-key"
          disabled={!isNew}
          value={draft.key}
          onChange={(e) => onChange({ ...draft, key: e.target.value })}
          placeholder="delivery"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-name">Name</Label>
        <Input
          id="module-name"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="module-description">Description</Label>
        <Input
          id="module-description"
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-feature">Operational rollout flag</Label>
        <NativeSelect
          id="module-feature"
          className="w-full"
          value={draft.featureId}
          onChange={(e) => onChange({ ...draft, featureId: e.target.value })}
          disabled={featuresPending || Boolean(featuresError)}
        >
          <NativeSelectOption value="">
            {featuresPending
              ? 'Loading flags…'
              : featuresError
                ? 'Flags unavailable'
                : 'No flag'}
          </NativeSelectOption>
          {features.map((feature) => (
            <NativeSelectOption key={feature.id} value={feature.id}>
              {feature.name} · {feature.slug}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {featuresError ? (
          <p className="text-destructive text-xs">{featuresError}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-position">Position</Label>
        <Input
          id="module-position"
          type="number"
          min="0"
          value={draft.position}
          onChange={(e) => onChange({ ...draft, position: e.target.value })}
        />
      </div>
    </section>
  )
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
      {message}
    </div>
  )
}
