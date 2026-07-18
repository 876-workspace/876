'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminConsumerContact, AdminUser } from '@876/admin'
import { client } from '@/lib/client'
import { ContactForm } from '../../contact-form'

type Props = {
  user: AdminUser
  contact: AdminConsumerContact
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function ContactEdit({ user, contact }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = (input: { nickname: string; notes: string }) => {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.users.updateContact(
        user.id,
        contact.id,
        {
          nickname: emptyToNull(input.nickname),
          notes: emptyToNull(input.notes),
        }
      )
      if (resultError) {
        setError(resultError.message)
        return
      }
      router.push(`/users/${user.username}/contacts`)
      router.refresh()
    })
  }

  const handleCancel = () => {
    router.push(`/users/${user.username}/contacts`)
  }

  return (
    <section className="876-card max-w-2xl">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-medium">Edit contact</h2>
        <p className="text-muted-foreground text-sm">
          Update the nickname or notes for this saved contact.
        </p>
      </div>
      <div className="p-5">
        <ContactForm
          mode="edit"
          contact={contact}
          isPending={isPending}
          error={error}
          onCancel={handleCancel}
          onSubmit={handleUpdate}
        />
      </div>
    </section>
  )
}
