'use client'

import { useState, useTransition } from 'react'
import type { AdminApplicationModule } from '@876/platform/compat'
import { Badge } from '@876/ui/badge'
import { AppError } from '@876/ui/app-error'
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

import type {
  ModuleFeatureOption,
  ModulesContext,
  ModulesResult,
  ModuleFeaturesResult,
} from '@/types/modules'

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
  modules: ModulesResult | Promise<ModulesResult>
  features: ModuleFeaturesResult | Promise<ModuleFeaturesResult>
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
  const registryManaged = contextState.value?.registryManaged ?? false
  const registryModuleKeys = contextState.value?.registryModuleKeys ?? []
  const registryModules = contextState.value?.registryModules ?? []
  const resolvedModules = localModules ?? modulesState.value?.data ?? []
  const resolvedFeatures = featuresState.value?.data ?? []
  const materializedKeys = new Set(resolvedModules.map((module) => module.key))
  const declaredOnlyModules = registryModules.filter(
    (module) => !materializedKeys.has(module.key)
  )
  const modulesError = modulesState.value?.error
  const featuresError = featuresState.value?.error
  const optionsUnavailable =
    [contextState, modulesState, featuresState].some(
      (state) => state.pending || state.error
    ) || Boolean(modulesError || featuresError)
  const identityLocked =
    editingId !== 'new' && registryModuleKeys.includes(draft.key)

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
      optionsUnavailable ||
      (editingId === 'new' && !draft.key.trim())
    )
      return

    const targetId = editingId
    const registryIdentity = registryModuleKeys.includes(draft.key)
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
          : await client.modules.update(
              targetId,
              registryIdentity
                ? {
                    feature_id: draft.featureId || null,
                    position: Number.isFinite(position) ? position : 0,
                  }
                : {
                    name: draft.name.trim(),
                    description: draft.description.trim() || null,
                    feature_id: draft.featureId || null,
                    position: Number.isFinite(position) ? position : 0,
                  }
            )
      if (result.error || !result.data) {
        setMessage(result.error?.message ?? 'Failed to save module.')
        return
      }
      setLocalModules((current) => {
        const base = current ?? modulesState.value?.data ?? []
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
        {canManage && registryManaged ? (
          <Badge variant="secondary">Registry managed</Badge>
        ) : canManage ? (
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
      {modulesError ? (
        <AppError
          title="Modules could not be loaded"
          error={modulesError}
          variant="banner"
          showCode
        />
      ) : null}

      {modulesState.pending ? (
        <Skeleton className="-mx-4 h-64 w-auto rounded-none sm:-mx-6 lg:-mx-8" />
      ) : modulesState.error ? (
        <InlineError message={modulesState.error.message} />
      ) : (
        <div className="876-card -mx-4 overflow-hidden rounded-none border-x-0 sm:-mx-6 lg:-mx-8">
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
                                    current ?? modulesState.value?.data ?? []
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

      {!modulesState.pending &&
      !modulesState.error &&
      declaredOnlyModules.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Declared capabilities</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              These capabilities are defined by the application registry but are
              not commercially materialized. They cannot be added to plans until
              the application has real module-entitlement semantics for them.
            </p>
          </div>
          <div className="876-card -mx-4 overflow-hidden rounded-none border-x-0 sm:-mx-6 lg:-mx-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capability</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {declaredOnlyModules.map((module) => (
                  <TableRow key={module.key}>
                    <TableCell>
                      <p className="font-medium">{module.name}</p>
                      <p className="text-muted-foreground max-w-md text-xs">
                        {module.description}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {module.key}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Declared only</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {editingId && (
        <ModuleForm
          draft={draft}
          features={resolvedFeatures}
          featuresPending={featuresState.pending}
          featuresError={
            featuresError?.message ??
            (featuresState.error ? 'Rollout flags could not be loaded.' : null)
          }
          identityLocked={identityLocked}
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
            disabled={isPending || optionsUnavailable || !appId}
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
  identityLocked,
  isNew,
  onChange,
}: {
  draft: Draft
  features: ModuleFeatureOption[]
  featuresPending: boolean
  featuresError: string | null
  identityLocked: boolean
  isNew: boolean
  onChange: (draft: Draft) => void
}) {
  return (
    <section className="876-card grid gap-4 p-5 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="module-key">Stable key</Label>
        <Input
          id="module-key"
          disabled={!isNew || identityLocked}
          value={draft.key}
          onChange={(e) => onChange({ ...draft, key: e.target.value })}
          placeholder="delivery"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module-name">Name</Label>
        <Input
          id="module-name"
          disabled={identityLocked}
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="module-description">Description</Label>
        <Input
          id="module-description"
          disabled={identityLocked}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
        {identityLocked ? (
          <p className="text-muted-foreground text-xs">
            Stable key, name, and description come from the application module
            registry. Rollout and ordering remain operator-managed.
          </p>
        ) : null}
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
