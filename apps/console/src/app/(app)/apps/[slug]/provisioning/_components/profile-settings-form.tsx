'use client'

import type {
  ApplicationProvisioningProfile,
  ApplicationProvisioningProfileConditionField,
} from '@876/core/types/application-provisioning-profile'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '@876/ui/native-select'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { client } from '@/lib/client'

type ConditionDraft = {
  localId: string
  group_key: string
  field: ApplicationProvisioningProfileConditionField
  value: string
  priority: number
}

const FIELD_OPTIONS: Array<{
  value: ApplicationProvisioningProfileConditionField
  label: string
}> = [
  { value: 'setup', label: 'Workspace setup' },
  { value: 'country', label: 'Country' },
  { value: 'subdivision', label: 'Subdivision' },
  { value: 'jurisdiction', label: 'Jurisdiction' },
  { value: 'plan', label: 'Plan' },
]

function newCondition(): ConditionDraft {
  return {
    localId: crypto.randomUUID(),
    group_key: 'rule-1',
    field: 'setup',
    value: '',
    priority: 0,
  }
}

export function ProfileSettingsForm({
  appId,
  profile,
}: {
  appId: string
  profile: ApplicationProvisioningProfile
}) {
  const router = useRouter()
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description ?? '')
  const [status, setStatus] = useState(profile.status)
  const [isDefault, setIsDefault] = useState(profile.is_default)
  const [conditions, setConditions] = useState<ConditionDraft[]>(() =>
    profile.conditions.map((condition) => ({
      localId: condition.id,
      group_key: condition.group_key,
      field: condition.field,
      value: condition.value,
      priority: condition.priority,
    }))
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateCondition(
    localId: string,
    patch: Partial<Omit<ConditionDraft, 'localId'>>
  ) {
    setConditions((current) =>
      current.map((condition) =>
        condition.localId === localId ? { ...condition, ...patch } : condition
      )
    )
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!name.trim()) {
      setError('A profile name is required.')
      return
    }
    if (
      !isDefault &&
      conditions.some(
        (condition) => !condition.group_key.trim() || !condition.value.trim()
      )
    ) {
      setError('Every routing condition requires a group key and value.')
      return
    }

    startTransition(async () => {
      if (!profile.is_default) {
        const policy =
          await client.applicationProvisioningProfiles.replacePolicy(
            appId,
            profile.key,
            {
              conditions: (isDefault ? [] : conditions).map((condition) => ({
                group_key: condition.group_key,
                field: condition.field,
                operator: 'equals',
                value: condition.value,
                priority: condition.priority,
              })),
            }
          )
        if (policy.error || !policy.data) {
          setError(policy.error?.message ?? 'Failed to save routing policy.')
          return
        }
      }

      const updated = await client.applicationProvisioningProfiles.update(
        appId,
        profile.key,
        {
          name: name.trim(),
          description: description.trim() || null,
          status,
          is_default: isDefault,
        }
      )
      if (updated.error || !updated.data) {
        setError(updated.error?.message ?? 'Failed to save provisioning profile.')
        return
      }

      setMessage('Provisioning profile saved.')
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="max-w-2xl space-y-4">
        <FormRow label="Name" htmlFor="profile-name" required>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormRow>

        <FormRow label="Description" htmlFor="profile-description">
          <Textarea
            id="profile-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </FormRow>

        <FormRow label="Status" htmlFor="profile-status">
          <NativeSelect
            id="profile-status"
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as ApplicationProvisioningProfile['status']
              )
            }
            disabled={profile.is_default || isPending}
          >
            <NativeSelectOption value="draft">Draft</NativeSelectOption>
            <NativeSelectOption value="active">Active</NativeSelectOption>
            <NativeSelectOption value="archived">Archived</NativeSelectOption>
          </NativeSelect>
        </FormRow>

        <div className="flex items-start justify-between gap-4 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium">Default profile</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Exactly one active default exists per app. Existing organization
              selections are not changed when the default changes. Promoting a
              profile clears its routing conditions because the default is the
              location-neutral fallback.
            </p>
          </div>
          <Switch
            checked={isDefault}
            disabled={profile.is_default || isPending}
            onCheckedChange={(checked) => {
              setIsDefault(checked)
              if (checked) setConditions([])
            }}
            aria-label="Make this the default application provisioning profile"
          />
        </div>
      </div>

      <section className="space-y-3 border-t pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Routing conditions</h3>
            <p className="text-muted-foreground mt-1 max-w-2xl text-xs">
              Conditions inside one group are AND requirements. Separate groups
              are OR alternatives. Specificity wins before priority. Workspace
              setup is preferred over repeating geography where possible.
            </p>
          </div>
          {!isDefault ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                setConditions((current) => [...current, newCondition()])
              }
            >
              Add condition
            </Button>
          ) : null}
        </div>

        {isDefault ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-xs">
            The default profile is location-neutral and cannot have routing
            conditions. It is used only when no active variant matches.
          </p>
        ) : conditions.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-xs">
            No routing conditions yet. Add at least one before activating this
            profile.
          </p>
        ) : (
          <div className="space-y-2">
            {conditions.map((condition) => (
              <div
                key={condition.localId}
                className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_1.4fr_7rem_auto]"
              >
                <Input
                  aria-label="Condition group"
                  value={condition.group_key}
                  onChange={(event) =>
                    updateCondition(condition.localId, {
                      group_key: event.target.value,
                    })
                  }
                  placeholder="jamaica-enterprise"
                />
                <NativeSelect
                  aria-label="Condition field"
                  value={condition.field}
                  onChange={(event) =>
                    updateCondition(condition.localId, {
                      field: event.target
                        .value as ApplicationProvisioningProfileConditionField,
                    })
                  }
                >
                  {FIELD_OPTIONS.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  aria-label="Condition value"
                  value={condition.value}
                  onChange={(event) =>
                    updateCondition(condition.localId, {
                      value: event.target.value,
                    })
                  }
                  placeholder={
                    condition.field === 'setup'
                      ? 'jamaica'
                      : condition.field === 'country'
                        ? 'JM'
                        : condition.field === 'plan'
                          ? 'enterprise'
                          : 'value'
                  }
                />
                <Input
                  aria-label="Condition priority"
                  type="number"
                  value={condition.priority}
                  onChange={(event) =>
                    updateCondition(condition.localId, {
                      priority: Number(event.target.value) || 0,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    setConditions((current) =>
                      current.filter(
                        (candidate) => candidate.localId !== condition.localId
                      )
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
