'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@876/admin'
import { client } from '@/lib/client'
import type { ContactFormInput } from '@/types/user-contacts'
import { ContactForm } from '../contact-form'

type Props = {
  user: AdminUser
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function ContactCreate({ user }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleCreate = (input: ContactFormInput) => {
    const contactUserId = input.contactUserId.trim()
    if (!contactUserId) {
      setError('Contact user ID is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.users.createContact(user.id, {
        contactUserId,
        nickname: emptyToNull(input.nickname),
        notes: emptyToNull(input.notes),
      })
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
        <h2 className="text-lg font-medium">Add contact</h2>
        <p className="text-muted-foreground text-sm">
          Save another person to this user&apos;s contacts by their user ID.
        </p>
      </div>
      <div className="p-5">
        <ContactForm
          mode="create"
          isPending={isPending}
          error={error}
          onCancel={handleCancel}
          onSubmit={handleCreate}
        />
      </div>
    </section>
  )
}
