'use client'

import { useState } from 'react'
import type { AdminConsumerContact } from '@876/admin'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'
import type { ContactFormInput } from '@/types/user-contacts'

type Props = {
  mode: 'create' | 'edit'
  contact?: AdminConsumerContact
  isPending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (input: ContactFormInput) => void
}

export function ContactForm({
  mode,
  contact,
  isPending,
  error,
  onCancel,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit'
  const [contactUserId, setContactUserId] = useState(
    isEdit && contact ? contact.contact_user_id : ''
  )
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
            <Label htmlFor="contact-user-id">Contact user ID</Label>
            <Input
              id="contact-user-id"
              value={contactUserId}
              placeholder="user_…"
              className="font-mono"
              onChange={(event) => setContactUserId(event.target.value)}
            />
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
        {error && <p className="text-destructive text-sm">{error}</p>}
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
