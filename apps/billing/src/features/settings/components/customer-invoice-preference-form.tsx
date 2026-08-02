'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

export function CustomerInvoicePreferenceForm({
  customerId,
  initial,
}: {
  customerId: string
  initial: {
    taxBehaviorOverride: 'EXCLUSIVE' | 'INCLUSIVE' | null
    lateFeeExempt: boolean
    invoiceNotes: string | null
    invoiceTerms: string | null
  }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="876-card max-w-2xl space-y-5 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const taxBehavior = String(data.get('taxBehaviorOverride') ?? '')

        setMessage(null)
        startTransition(async () => {
          const result = await client.customers.update(customerId, {
            taxBehaviorOverride:
              taxBehavior === 'EXCLUSIVE' || taxBehavior === 'INCLUSIVE'
                ? taxBehavior
                : null,
            lateFeeExempt: data.get('lateFeeExempt') === 'on',
            invoiceNotes: String(data.get('invoiceNotes') ?? '').trim() || null,
            invoiceTerms: String(data.get('invoiceTerms') ?? '').trim() || null,
          })
          if (result.error) {
            setMessage(result.error.message)
            return
          }

          setMessage('Customer invoice preferences saved.')
          router.refresh()
        })
      }}
    >
      <div>
        <p className="876-eyebrow">Invoice preferences</p>
        <p className="text-muted-foreground mt-1 text-xs text-pretty">
          Customer values override workspace defaults for new invoices only.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-tax-behavior">Tax display</Label>
          <NativeSelect
            id="customer-tax-behavior"
            name="taxBehaviorOverride"
            defaultValue={initial.taxBehaviorOverride ?? ''}
            className="w-full"
          >
            <NativeSelectOption value="">Workspace default</NativeSelectOption>
            <NativeSelectOption value="EXCLUSIVE">
              Tax exclusive
            </NativeSelectOption>
            <NativeSelectOption value="INCLUSIVE">
              Tax inclusive
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-late-fees">Late fees</Label>
          <label className="border-border flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              id="customer-late-fees"
              name="lateFeeExempt"
              type="checkbox"
              defaultChecked={initial.lateFeeExempt}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-medium">Exclude from late fees</span>
              <span className="text-muted-foreground mt-1 block text-xs text-pretty">
                Workspace late-fee runs will always skip this customer.
              </span>
            </span>
          </label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-invoice-note">Default customer note</Label>
          <Textarea
            id="customer-invoice-note"
            name="invoiceNotes"
            defaultValue={initial.invoiceNotes ?? ''}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-invoice-terms">Default terms</Label>
          <Textarea
            id="customer-invoice-terms"
            name="invoiceTerms"
            defaultValue={initial.invoiceTerms ?? ''}
            rows={4}
          />
        </div>
      </div>
      {message ? (
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
      <Button type="submit" variant="info" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save invoice preferences'}
      </Button>
    </form>
  )
}
