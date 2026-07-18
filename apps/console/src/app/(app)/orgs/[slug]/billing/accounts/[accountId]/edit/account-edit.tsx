'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminBillingAccount } from '@876/admin'

import { client } from '@/lib/client'

import { BillingAccountForm } from '../../account-form'
import {
  createBillingAccountUpdateDraft,
  toBillingAccountUpdateParams,
  type BillingAccountDraft,
} from '../../account-utils'

type Props = {
  account: AdminBillingAccount
  orgSlug: string
}

export function BillingAccountEdit({ account, orgSlug }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(createBillingAccountUpdateDraft(account))

  function handleDraftChange(field: keyof BillingAccountDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function handleUpdate() {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.billing.updateAccount(
        account.id,
        toBillingAccountUpdateParams(draft)
      )
      if (resultError) {
        setError(resultError.message)
        return
      }

      router.push(`/orgs/${orgSlug}/billing/accounts`)
      router.refresh()
    })
  }

  function handleCancel() {
    router.push(`/orgs/${orgSlug}/billing/accounts`)
  }

  return (
    <section className="876-card max-w-4xl">
      <div className="border-876-surface-border border-b px-5 py-4">
        <h2 className="text-lg font-medium">Edit account</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          Update invoice routing and billing account details.
        </p>
      </div>
      <div className="p-5">
        <BillingAccountForm
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
