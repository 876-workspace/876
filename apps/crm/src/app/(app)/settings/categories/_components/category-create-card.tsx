'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { CategoryIcon, type CategoryIconKey } from '@876/ui/category-icons'
import { FormRow, FormRowGroup } from '@876/ui/form-row'
import { XIcon } from '@876/ui/icons'
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
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { RequestPriority } from '@/types/crm'
import {
  CategoryColorPicker,
  getCategoryColorVariant,
} from './category-color-picker'
import { CategoryIconPicker } from './category-icon-picker'

type ErrorValue = { code: string; message: string }

type Props = {
  priorities: RequestPriority[]
  teamNames: Record<string, string>
  onClose: () => void
  onSuccess: (newCategoryId: string) => void
  className?: string
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function CategoryCreateCard({
  priorities,
  teamNames,
  onClose,
  onSuccess,
  className,
}: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('blue')
  const [icon, setIcon] = useState<CategoryIconKey>('tag')
  const [defaultTeamId, setDefaultTeamId] = useState('')
  const [defaultPriorityId, setDefaultPriorityId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const colorVariant = getCategoryColorVariant(color)
  const availablePriorities = priorities.filter((p) => p.isActive)
  const teamOptions = Object.entries(teamNames).map(([id, teamName]) => ({
    id,
    name: teamName,
  }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const normalizedName = name.trim()
    if (!normalizedName) {
      setNameError('Name is required.')
      return
    }

    setSaving(true)
    setError(null)
    setNameError(null)

    const result = await client.requestCategories.create({
      name: normalizedName,
      description: description.trim() || null,
      color,
      icon,
      defaultTeamId: defaultTeamId || null,
      defaultPriorityId: defaultPriorityId || null,
      isActive,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    toast.success('Category created')
    onSuccess(result.data.id)
  }

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
            colorVariant.bg,
            colorVariant.text,
            colorVariant.border
          )}
        >
          <CategoryIcon name={icon} className="size-4" />
        </div>

        <h2 className="text-foreground min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {name.trim() || 'New category'}
        </h2>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close category creation"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <form
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <FormRow
            htmlFor="create-category-name"
            label="Name"
            required
            className={rowClassName}
          >
            <div className="space-y-1.5">
              <Input
                id="create-category-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError(null)
                }}
                placeholder="e.g. Billing & Accounts"
                disabled={saving}
                aria-invalid={Boolean(nameError)}
                required
                autoFocus
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
            htmlFor="create-category-description"
            label="Description"
            hint="A short description of requests in this category."
            className={rowClassName}
          >
            <Textarea
              id="create-category-description"
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
              <SelectTrigger aria-label="Default priority" className="w-full">
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

          <FormRow label="Active" className={rowClassName}>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="create-category-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={saving}
              />
              <Label htmlFor="create-category-active" className="mb-0">
                Active category
              </Label>
            </div>
          </FormRow>

          {error ? (
            <AppError
              title="Category could not be created"
              error={error}
              variant="form"
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
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </section>
  )
}
