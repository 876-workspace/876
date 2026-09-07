'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { QuoteUpdateInput } from '@/types/quote'

type InitialQuote = QuoteUpdateInput

function toDateInput(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString().slice(0, 10) : ''
}

function toUnix(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1000)
}

export function QuoteEditForm({ quoteId, initial }: { quoteId: string; initial: InitialQuote }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [issueAt, setIssueAt] = useState(toDateInput(initial.issueAt))
  const [expiresAt, setExpiresAt] = useState(toDateInput(initial.expiresAt))
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [terms, setTerms] = useState(initial.terms ?? '')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const issue = toUnix(issueAt)
    const expires = toUnix(expiresAt)
    if ((issueAt && issue === null) || (expiresAt && expires === null)) {
      setError('Enter valid quote dates.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await client.quotes.update(quoteId, {
        issueAt: issue,
        expiresAt: expires,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
      })
      if (result.error) {
        setError(result.error.message)
        return
      }
      router.push(`/quotes/${quoteId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <section className="876-card space-y-5 p-5 sm:p-6">
        <FormRow label="Quote date">
          <Input type="date" value={issueAt} onChange={(event) => setIssueAt(event.target.value)} disabled={isPending} />
        </FormRow>
        <FormRow label="Expires">
          <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={isPending} />
        </FormRow>
        <FormRow label="Customer note">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isPending} />
        </FormRow>
        <FormRow label="Terms and conditions">
          <Textarea value={terms} onChange={(event) => setTerms(event.target.value)} disabled={isPending} />
        </FormRow>
      </section>
      {error ? <AppError error={{ code: 'quote/update-failed', message: error }} variant="form" /> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(`/quotes/${quoteId}`)} disabled={isPending}>Cancel</Button>
        <Button type="submit" variant="info" disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}
