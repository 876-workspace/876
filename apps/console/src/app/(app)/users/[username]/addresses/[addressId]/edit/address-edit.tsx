'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminAddress, AdminUser } from '@876/admin'
import { client } from '@/lib/client'
import { AddressForm } from '../../address-form'
import {
  createAddressUpdateDraft,
  toAddressUpdateParams,
} from '../../address-utils'
import type {
  AddressUpdateDraft,
  AddressUpdateDraftChange,
} from '@/types/user-addresses'

type Props = {
  user: AdminUser
  address: AdminAddress
}

export function AddressEdit({ user, address }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(createAddressUpdateDraft(address))

  const handleDraftChange: AddressUpdateDraftChange = <
    Field extends keyof AddressUpdateDraft,
  >(
    field: Field,
    value: AddressUpdateDraft[Field]
  ) => {
    setDraft((draft) => ({ ...draft, [field]: value }))
  }

  const handleUpdate = () => {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.users.updateAddress(
        user.id,
        address.id,
        toAddressUpdateParams(draft)
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
        <h2 className="text-lg font-medium">Edit address</h2>
        <p className="text-muted-foreground text-sm">
          Update the details of this saved address.
        </p>
      </div>
      <div className="p-5">
        <AddressForm
          mode="edit"
          draft={draft}
          isPending={isPending}
          error={error}
          onDraftChange={handleDraftChange}
          onCancel={handleCancel}
          onSubmit={handleUpdate}
        />
      </div>
    </section>
  )
}
