'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { InvoiceStatus, InvoiceUpdateInput } from '@/types/invoice'

import { getInvoiceEditability } from '../_lib/invoice-editability'

type Props = {
  invoiceId: string
  status: InvoiceStatus
  initial: InvoiceUpdateInput
}

function toDateInput(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString().slice(0, 10) : ''
}

function toUnix(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1000)
}

export function InvoiceEditForm({ invoiceId, status, initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [issueAt, setIssueAt] = useState(toDateInput(initial.issueAt))
  const [dueAt, setDueAt] = useState(toDateInput(initial.dueAt))
  const [referenceNumber, setReferenceNumber] = useState(
    initial.referenceNumber ?? ''
  )
  const [orderNumber, setOrderNumber] = useState(initial.orderNumber ?? '')
  const [subject, setSubject] = useState(initial.subject ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [terms, setTerms] = useState(initial.terms ?? '')
  const { restricted } = getInvoiceEditability(status)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const due = toUnix(dueAt)
    if (dueAt && due === null) {
      setError('Enter a valid due date.')
      return
    }
    const issue = toUnix(issueAt)
    if (!restricted && issueAt && issue === null) {
      setError('Enter a valid invoice date.')
      return
    }
    setError(null)
    startTransition(async () => {
      const update: InvoiceUpdateInput = {
        dueAt: due,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
      }
      if (!restricted) {
        update.issueAt = issue
        update.orderNumber = orderNumber.trim() || null
        update.subject = subject.trim() || null
      }
      const result = await client.invoices.update(invoiceId, update)
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/invoices/${invoiceId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <section className="876-card space-y-5 p-5 sm:p-6">
        {!restricted ? (
          <FormRow label="Invoice date">
            <Input
              type="date"
              value={issueAt}
              onChange={(event) => setIssueAt(event.target.value)}
              disabled={isPending}
            />
          </FormRow>
        ) : null}
        <FormRow label="Due date">
          <Input
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        {!restricted ? (
          <FormRow label="Order number">
            <Input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              maxLength={120}
              disabled={isPending}
            />
          </FormRow>
        ) : null}
        <FormRow label="Reference">
          <Input
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            maxLength={120}
            disabled={isPending}
          />
        </FormRow>
        {!restricted ? (
          <FormRow label="Subject">
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={300}
              disabled={isPending}
            />
          </FormRow>
        ) : null}
        <FormRow label="Customer note">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
        <FormRow label="Terms and conditions">
          <Textarea
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            disabled={isPending}
          />
        </FormRow>
      </section>
      {error ? (
        <AppError
          error={{ code: 'invoice/update-failed', message: error }}
          variant="form"
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/invoices/${invoiceId}`)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
