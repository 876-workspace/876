'use client'

import { Button } from '@876/ui/button'

import { Field } from '../billing-shared'
import type { BillingAccountDraft } from './account-utils'

type Props = {
  mode: 'create' | 'edit'
  draft: BillingAccountDraft
  isPending: boolean
  error: string | null
  onDraftChange: (field: keyof BillingAccountDraft, value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function BillingAccountForm({
  mode,
  draft,
  isPending,
  error,
  onDraftChange,
  onCancel,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit'

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            id="billing-account-name"
            label="Name"
            value={draft.name}
            onChange={(name) => onDraftChange('name', name)}
          />
          <Field
            id="billing-account-email"
            label="Email"
            type="email"
            value={draft.email}
            onChange={(email) => onDraftChange('email', email)}
          />
          <Field
            id="billing-account-invoice-email"
            label="Invoice email"
            type="email"
            value={draft.invoiceEmail}
            onChange={(invoiceEmail) =>
              onDraftChange('invoiceEmail', invoiceEmail)
            }
          />
          <Field
            id="billing-account-currency"
            label="Currency"
            value={draft.currency}
            onChange={(currency) => onDraftChange('currency', currency)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="info" onClick={onSubmit} disabled={isPending}>
          {isEdit ? 'Save changes' : 'Add account'}
        </Button>
      </div>
    </div>
  )
}
