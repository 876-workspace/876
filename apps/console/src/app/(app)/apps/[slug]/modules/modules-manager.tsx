'use client'

import { useState, useTransition } from 'react'
import type { AdminApplicationModule } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { Pencil, Plus, Trash } from '@876/ui/icons'

import { client } from '@/lib/client'

type FeatureOption = { id: string; name: string; slug: string }
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
  appId,
  initialModules,
  features,
}: {
  appId: string
  initialModules: AdminApplicationModule[]
  features: FeatureOption[]
}) {
  const [modules, setModules] = useState(initialModules)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      !editingId ||
      !draft.name.trim() ||
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
      setModules((current) => {
        const exists = current.some((item) => item.id === result.data!.id)
        return exists
          ? current.map((item) =>
              item.id === result.data!.id ? result.data! : item
            )
          : [...current, result.data!]
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
          <p className="876-eyebrow">Product structure</p>
          <h1 className="876-page-title mt-1">Modules</h1>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingId('new')
            setDraft(emptyDraft)
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>

      <div className="876-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Rollout flag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
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
                          const result = await client.modules.archive(module.id)
                          if (!result.error)
                            setModules((current) =>
                              current.map((item) =>
                                item.id === module.id
                                  ? { ...item, status: 'archived' }
                                  : item
                              )
                            )
                        })
                      }
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingId && (
        <ModuleForm
          draft={draft}
          features={features}
          isNew={editingId === 'new'}
          onChange={setDraft}
        />
      )}
      {editingId && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
          <Button disabled={isPending} onClick={save}>
            Save module
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-sm" role="status">
        {message}
      </p>
    </div>
  )
}

function ModuleForm({
  draft,
  features,
  isNew,
  onChange,
}: {
  draft: Draft
  features: FeatureOption[]
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
        >
          <NativeSelectOption value="">No flag</NativeSelectOption>
          {features.map((feature) => (
            <NativeSelectOption key={feature.id} value={feature.id}>
              {feature.name} · {feature.slug}
            </NativeSelectOption>
          ))}
        </NativeSelect>
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
