'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminConsumerProfile, AdminUser } from '@876/admin'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import type { ClientResult } from '@/types/api'

type Props = {
  user: AdminUser
  profile: AdminConsumerProfile | null
}

const GENDERS = ['', 'male', 'female', 'other'] as const

export function ConsumerDataEditor({ user, profile }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [profileDraft, setProfileDraft] = useState({
    first_name: profile?.first_name ?? user.first_name,
    last_name: profile?.last_name ?? user.last_name,
    middle_name: profile?.middle_name ?? user.middle_name ?? '',
    nickname: profile?.nickname ?? '',
    avatar: profile?.avatar ?? user.avatar ?? '',
    gender: profile?.gender ?? '',
    phone_number: profile?.phone_number ?? '',
    date_of_birth: profile?.date_of_birth ?? '',
    language: profile?.language ?? '',
    timezone: profile?.timezone ?? '',
  })

  function refreshAfter<T>(work: () => Promise<ClientResult<T>>) {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await work()
      if (resultError) {
        setError(resultError.message)
        return
      }
      router.refresh()
    })
  }

  function saveProfile() {
    refreshAfter(() => {
      const params = {
        ...profileDraft,
        middle_name: emptyToNull(profileDraft.middle_name),
        nickname: emptyToNull(profileDraft.nickname),
        avatar: emptyToNull(profileDraft.avatar),
        gender: emptyToNull(profileDraft.gender) as
          | 'male'
          | 'female'
          | 'other'
          | null,
        phone_number: emptyToNull(profileDraft.phone_number),
        date_of_birth: emptyToNull(profileDraft.date_of_birth),
        language: emptyToNull(profileDraft.language),
        timezone: emptyToNull(profileDraft.timezone),
      }
      return profile
        ? client.users.updateProfile(user.id, params)
        : client.users.createProfile(user.id, params)
    })
  }

  function deleteProfile() {
    if (!profile) return
    refreshAfter(() => client.users.deleteProfile(user.id))
  }

  return (
    <div>
      <div className="876-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-foreground text-sm font-medium">Customer data</h2>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-sm font-medium">Personal information</h3>
            <div className="grid gap-3">
              <FieldInput
                label="First name"
                value={profileDraft.first_name}
                onChange={(value) =>
                  setProfileDraft((draft) => ({ ...draft, first_name: value }))
                }
              />
              <FieldInput
                label="Last name"
                value={profileDraft.last_name}
                onChange={(value) =>
                  setProfileDraft((draft) => ({ ...draft, last_name: value }))
                }
              />
              <FieldInput
                label="Nickname"
                value={profileDraft.nickname}
                onChange={(value) =>
                  setProfileDraft((draft) => ({ ...draft, nickname: value }))
                }
              />
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <NativeSelect
                  value={profileDraft.gender}
                  onChange={(event) =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      gender: event.target.value,
                    }))
                  }
                >
                  <NativeSelectOption value="">Unset</NativeSelectOption>
                  {GENDERS.filter(Boolean).map((gender) => (
                    <NativeSelectOption key={gender} value={gender}>
                      {gender}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <FieldInput
                label="Phone"
                value={profileDraft.phone_number}
                onChange={(value) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    phone_number: value,
                  }))
                }
              />
              <FieldInput
                label="Date of birth"
                value={profileDraft.date_of_birth}
                onChange={(value) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    date_of_birth: value,
                  }))
                }
              />
              <FieldInput
                label="Language"
                value={profileDraft.language}
                onChange={(value) =>
                  setProfileDraft((draft) => ({ ...draft, language: value }))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={isPending}>
                {profile ? 'Update profile' : 'Create profile'}
              </Button>
              {profile && (
                <Button
                  variant="outline"
                  onClick={deleteProfile}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}
