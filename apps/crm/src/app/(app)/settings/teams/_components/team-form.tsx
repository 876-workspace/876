'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { CrmTeamAutoAssign } from '@/types/crm'

import { TeamColorPicker } from './team-color-picker'

type ErrorValue = { code: string; message: string }

export type TeamFormValues = {
  name: string
  description: string
  color: string
  autoAssign: CrmTeamAutoAssign
  isDefault: boolean
}

export const EMPTY_TEAM_FORM: TeamFormValues = {
  name: '',
  description: '',
  color: 'blue',
  autoAssign: 'NONE',
  isDefault: false,
}

const rowClassName = 'sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3'

export function TeamForm({
  teamId,
  initial = EMPTY_TEAM_FORM,
}: {
  teamId?: string
  initial?: TeamFormValues
}) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<ErrorValue | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    const result = teamId
      ? await client.teams.update(teamId, payload)
      : await client.teams.create(payload)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.replace(`/settings/teams/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6" noValidate>
      <div className="876-card space-y-5 p-5">
        <FormRow
          htmlFor="team-name"
          label="Name"
          required
          className={rowClassName}
        >
          <div className="space-y-1.5">
            <Input
              id="team-name"
              value={values.name}
              onChange={(event) => {
                set('name', event.target.value)
                if (nameError) setNameError(null)
              }}
              disabled={saving}
              aria-invalid={Boolean(nameError)}
              required
            />
            {nameError ? (
              <p className="text-destructive text-xs" role="alert">
                {nameError}
              </p>
            ) : null}
          </div>
        </FormRow>

        <FormRow
          htmlFor="team-description"
          label="Description"
          hint="A short internal description of the requests this team handles."
          className={rowClassName}
        >
          <Textarea
            id="team-description"
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            disabled={saving}
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
              id="team-default"
              checked={values.isDefault}
              onCheckedChange={(checked) => set('isDefault', checked)}
              disabled={saving}
            />
            <Label htmlFor="team-default" className="mb-0">
              Set as default team
            </Label>
          </div>
        </FormRow>
      </div>

      {error ? (
        <AppError
          title={teamId ? 'Team could not be saved' : 'Team could not be added'}
          error={error}
          variant="form"
        />
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" variant="info" disabled={saving}>
          {teamId ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
