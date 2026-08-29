'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Users, XIcon } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { CrmTeamAutoAssign } from '@/types/crm'

import { TEAM_COLORS, type TeamFormValues } from './team-form'
import { getTeamColorVariant, TEAM_COLOR_VARIANTS } from './team-row'

const EMPTY: TeamFormValues = {
  name: '',
  description: '',
  color: 'blue',
  autoAssign: 'NONE',
  isDefault: false,
}

type ErrorValue = { code: string; message: string }

type Props = {
  onClose: () => void
  onSuccess: (newTeamId: string) => void
  className?: string
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function TeamCreateCard({ onClose, onSuccess, className }: Props) {
  const [values, setValues] = useState<TeamFormValues>(EMPTY)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const colorVariant = getTeamColorVariant(values.color)

  const set = <K extends keyof TeamFormValues>(
    key: K,
    value: TeamFormValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const name = values.name.trim()
    if (!name) {
      setNameError('Name is required.')
      return
    }

    setSaving(true)
    setError(null)
    setNameError(null)

    const payload = {
      name,
      description: values.description.trim() || null,
      color: values.color,
      autoAssign: values.autoAssign,
      isDefault: values.isDefault,
    }

    const result = await client.teams.create(payload)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    toast.success('Team created')
    onSuccess(result.data.id)
  }

  return (
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
            'flex size-12 shrink-0 items-center justify-center rounded-xl border transition-colors',
            colorVariant.bg,
            colorVariant.text,
            colorVariant.border
          )}
        >
          <Users className="size-6" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
            Create new team
          </h2>
          <p className="text-muted-foreground truncate text-xs">
            Configure team details, routing rules, and color.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close team creation"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      {/* Form Content */}
      <form
        onSubmit={submit}
        className="flex flex-1 flex-col justify-between p-6"
        noValidate
      >
        <div className="space-y-5">
          <FormRow
            htmlFor="create-team-name"
            label="Name"
            required
            className={rowClassName}
          >
            <div className="space-y-1.5">
              <Input
                id="create-team-name"
                value={values.name}
                onChange={(event) => {
                  set('name', event.target.value)
                  if (nameError) setNameError(null)
                }}
                placeholder="e.g. Support Tier 1"
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

          <FormRow
            htmlFor="create-team-description"
            label="Description"
            hint="A short description of the requests this team handles."
            className={rowClassName}
          >
            <Textarea
              id="create-team-description"
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="e.g. Handles all inbound consumer ticket triage."
              disabled={saving}
              rows={3}
            />
          </FormRow>

          <FormRow label="Colour" className={rowClassName}>
            <RadioGroup
              value={values.color}
              onValueChange={(value) => value && set('color', value)}
              disabled={saving}
              className="flex flex-row flex-wrap items-center gap-3 pt-1"
              aria-label="Colour"
            >
              {TEAM_COLORS.map((color) => {
                const isSelected = values.color === color
                const config =
                  TEAM_COLOR_VARIANTS[color] ?? TEAM_COLOR_VARIANTS.blue
                return (
                  <label
                    key={color}
                    title={color}
                    aria-label={color}
                    className="relative flex aspect-square size-6 shrink-0 cursor-pointer items-center justify-center select-none"
                  >
                    <RadioGroupItem value={color} className="sr-only" />
                    <span
                      className={cn(
                        'aspect-square size-6 shrink-0 rounded-full border border-black/10 shadow-xs transition-all dark:border-white/10',
                        config.dot,
                        isSelected
                          ? 'ring-foreground ring-offset-background ring-2 ring-offset-2'
                          : 'opacity-80 hover:scale-110 hover:opacity-100'
                      )}
                    />
                  </label>
                )
              })}
            </RadioGroup>
          </FormRow>

          <FormRow
            label="Auto-assign"
            hint="Choose how new unassigned requests are distributed."
            className={rowClassName}
          >
            <RadioGroup
              value={values.autoAssign}
              onValueChange={(value) =>
                set('autoAssign', value as CrmTeamAutoAssign)
              }
              disabled={saving}
              className="space-y-2 pt-1"
            >
              <label className="flex items-center gap-2 text-xs">
                <RadioGroupItem value="NONE" />
                None
              </label>
              <label className="flex items-center gap-2 text-xs">
                <RadioGroupItem value="ROUND_ROBIN" />
                Round robin
              </label>
              <label className="flex items-center gap-2 text-xs">
                <RadioGroupItem value="LEAST_BUSY" />
                Least busy
              </label>
            </RadioGroup>
          </FormRow>

          <FormRow label="Default" className={rowClassName}>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="create-team-default"
                checked={values.isDefault}
                onCheckedChange={(checked) => set('isDefault', checked)}
                disabled={saving}
              />
              <Label htmlFor="create-team-default" className="mb-0 text-xs">
                Set as default team
              </Label>
            </div>
          </FormRow>
        </div>

        {error ? (
          <div className="mt-4">
            <AppError
              title="Team could not be created"
              error={error}
              variant="form"
            />
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-end gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" variant="info" disabled={saving}>
            {saving ? 'Creating…' : 'Create team'}
          </Button>
        </div>
      </form>
    </section>
  )
}
