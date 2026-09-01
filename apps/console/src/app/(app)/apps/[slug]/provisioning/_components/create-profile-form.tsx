'use client'

import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateProfileForm({
  appId,
  appSlug,
  profiles,
}: {
  appId: string
  appSlug: string
  profiles: ApplicationProvisioningProfile[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleName(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !key.trim()) {
      setError('A name and key are required.')
      return
    }

    startTransition(async () => {
      const result = await client.applicationProvisioningProfiles.create(appId, {
        key,
        name: name.trim(),
        description: description.trim() || null,
        copy_from: copyFrom || null,
        is_default: isDefault,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to create provisioning profile.')
        return
      }

      router.push(
        `/apps/${encodeURIComponent(appSlug)}/provisioning/${encodeURIComponent(result.data.key)}`
      )
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <FormRow label="Name" htmlFor="profile-name" required>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => handleName(event.target.value)}
          placeholder="Jamaica enterprise"
          autoFocus
        />
      </FormRow>

      <FormRow
        label="Key"
        htmlFor="profile-key"
        required
        hint="Permanent identifier for this app provisioning profile."
      >
        <Input
          id="profile-key"
          value={key}
          onChange={(event) => {
            setKeyEdited(true)
            setKey(slugify(event.target.value))
          }}
          placeholder="jamaica-enterprise"
        />
      </FormRow>

      <FormRow label="Description" htmlFor="profile-description">
        <Textarea
          id="profile-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Optional operator description."
        />
      </FormRow>

      <FormRow
        label="Copy defaults from"
        htmlFor="profile-copy-from"
        hint="Copies the selected profile's published manifest into a new draft. Routing conditions are never copied."
      >
        <NativeSelect
          id="profile-copy-from"
          value={copyFrom}
          onChange={(event) => setCopyFrom(event.target.value)}
        >
          <NativeSelectOption value="">Start with an empty manifest</NativeSelectOption>
          {profiles
            .filter((profile) => profile.published_revision !== null)
            .map((profile) => (
              <NativeSelectOption key={profile.id} value={profile.key}>
                {profile.name} ({profile.key})
              </NativeSelectOption>
            ))}
        </NativeSelect>
      </FormRow>

      <div className="flex items-start justify-between gap-4 rounded-md border p-4">
        <div>
          <p className="text-sm font-medium">Make default profile</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The default is used only when no active conditional profile matches.
            Making this profile default moves the legacy app manifest target to it
            without rerouting organizations already assigned another profile.
          </p>
        </div>
        <Switch
          checked={isDefault}
          onCheckedChange={setIsDefault}
          disabled={isPending}
          aria-label="Make this the default provisioning profile"
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            router.push(`/apps/${encodeURIComponent(appSlug)}/provisioning`)
          }
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create profile'}
        </Button>
      </div>
    </form>
  )
}
