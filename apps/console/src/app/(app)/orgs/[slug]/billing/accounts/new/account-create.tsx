'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { client } from '@/lib/client'

import { BillingAccountForm } from '../account-form'
import {
  createEmptyBillingAccountDraft,
  toBillingAccountCreateParams,
  type BillingAccountDraft,
} from '../account-utils'

type Props = {
  orgId: string
  orgSlug: string
}

export function BillingAccountCreate({ orgId, orgSlug }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState(createEmptyBillingAccountDraft())

  function handleDraftChange(field: keyof BillingAccountDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.billing.createAccount(
        toBillingAccountCreateParams(orgId, draft)
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
        <h2 className="text-lg font-medium">Add account</h2>
        <p className="text-muted-foreground text-sm text-pretty">
          Create an invoice profile for this organization.
        </p>
      </div>
      <div className="p-5">
        <BillingAccountForm
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
