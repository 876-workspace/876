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

import { TeamColorPicker } from './team-color-picker'
import { EMPTY_TEAM_FORM, type TeamFormValues } from './team-form'
import { getTeamColorVariant } from './team-row'

type ErrorValue = { code: string; message: string }

type Props = {
  onClose: () => void
  onSuccess: (newTeamId: string) => void
  className?: string
}

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function TeamCreateCard({ onClose, onSuccess, className }: Props) {
  const [values, setValues] = useState<TeamFormValues>(EMPTY_TEAM_FORM)
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

    const result = await client.teams.create({
      name,
      description: values.description.trim() || null,
      color: values.color,
      autoAssign: values.autoAssign,
      isDefault: values.isDefault,
    })

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
      <header className="border-876-surface-border flex shrink-0 items-center gap-3 border-b px-6 py-4">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
            colorVariant.bg,
            colorVariant.text,
            colorVariant.border
          )}
        >
          <Users className="size-4" />
        </div>

        <h2 className="text-foreground min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {values.name.trim() || 'New team'}
        </h2>

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

      <form
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
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
                placeholder="Support tier 1"
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
              disabled={saving}
              rows={3}
            />
          </FormRow>

          <FormRow label="Colour" className={rowClassName}>
            <div className="pt-1.5">
              <TeamColorPicker
                value={values.color}
                onChange={(color) => set('color', color)}
                disabled={saving}
              />
            </div>
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
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="NONE" />
                None
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="ROUND_ROBIN" />
                Round robin
              </label>
              <label className="flex items-center gap-2 text-sm">
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
              <Label htmlFor="create-team-default" className="mb-0">
                Set as default team
              </Label>
            </div>
          </FormRow>

          {error ? (
            <AppError
              title="Team could not be created"
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
