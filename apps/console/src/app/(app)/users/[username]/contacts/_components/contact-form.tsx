'use client'

import { useState } from 'react'
import type { AdminConsumerContact } from '@876/platform/compat'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import type { ContactFormInput } from '@/types/user-contacts'
import {
  PrincipalSearch,
  type Principal,
} from '@/features/access/components/principal-search'

type Props = {
  mode: 'create' | 'edit'
  contact?: AdminConsumerContact
  /** The user whose contacts these are — never offered as their own contact. */
  ownerUserId?: string
  isPending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (input: ContactFormInput) => void
}

export function ContactForm({
  mode,
  contact,
  ownerUserId,
  isPending,
  error,
  onCancel,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit'
  const [selected, setSelected] = useState<Principal | null>(null)
  const contactUserId =
    isEdit && contact ? contact.contact_user_id : (selected?.id ?? '')
  const [nickname, setNickname] = useState(
    isEdit && contact ? (contact.nickname ?? '') : ''
  )
  const [notes, setNotes] = useState(
    isEdit && contact ? (contact.notes ?? '') : ''
  )

  function handleSubmit() {
    onSubmit({ contactUserId, nickname, notes })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {!isEdit && (
          <div className="space-y-1.5">
            <Label>876 user</Label>
            {selected ? (
              <div className="border-876-surface-border flex items-center gap-3 rounded-lg border px-3 py-2">
                <Avatar size="sm">
                  {selected.avatarUrl ? (
                    <AvatarImage src={selected.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {selected.name[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium">
                    {selected.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {selected.detail}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setSelected(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <PrincipalSearch
                kind="user"
                excludeIds={ownerUserId ? [ownerUserId] : []}
                allExcludedLabel="No other matching users."
                onSelect={setSelected}
                disabled={isPending}
              />
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="contact-nickname">Nickname</Label>
          <Input
            id="contact-nickname"
            value={nickname}
            placeholder="Optional"
            onChange={(event) => setNickname(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-notes">Notes</Label>
          <Textarea
            id="contact-notes"
            value={notes}
            placeholder="Optional"
            className="min-h-24"
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        {error && <p className="text-destructive text-[0.8125rem]">{error}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="info"
          onClick={handleSubmit}
          disabled={isPending || (!isEdit && !contactUserId.trim())}
        >
          {isEdit ? 'Save changes' : 'Add contact'}
        </Button>
      </div>
    </div>
  )
}
