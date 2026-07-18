'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@876/admin'
import { client } from '@/lib/client'
import { AddressForm } from '../address-form'
import {
  createEmptyAddressDraft,
  toAddressCreateParams,
} from '../address-utils'
import type {
  AddressCreateDraft,
  AddressCreateDraftChange,
} from '@/types/user-addresses'

type Props = {
  user: AdminUser
}

export function AddressCreate({ user }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(createEmptyAddressDraft())

  const handleDraftChange: AddressCreateDraftChange = <
    Field extends keyof AddressCreateDraft,
  >(
    field: Field,
    value: AddressCreateDraft[Field]
  ) => {
    setDraft((draft) => ({ ...draft, [field]: value }))
  }

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.users.createAddress(
        user.id,
        toAddressCreateParams(draft)
      )
      if (resultError) {
        setError(resultError.message)
        return
      }
      router.push(`/users/${user.username}/addresses`)
      router.refresh()
    })
  }

  const handleCancel = () => {
    router.push(`/users/${user.username}/addresses`)
  }

  return (
    <section className="876-card max-w-4xl">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-medium">Add address</h2>
        <p className="text-muted-foreground text-sm">
          Add a new saved address for this user.
        </p>
      </div>
      <div className="p-5">
        <AddressForm
          mode="create"
          draft={draft}
          isPending={isPending}
          error={error}
          onDraftChange={handleDraftChange}
          onCancel={handleCancel}
          onSubmit={handleCreate}
        />
      </div>
    </section>
  )
}
