'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'

import { client } from '@/lib/client'

/** Host-owned mutation UI; the shared panels stay read-only. */
export function EmailDomainAddForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      aria-label="Add sending domain"
      className="876-card space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        const value = name.trim().toLowerCase()
        if (value === '') {
          setError('Enter a domain name.')
          return
        }
        setError(null)
        startTransition(async () => {
          const result = await client.emailDomains.create({ name: value })
          if (result.error) {
            setError(result.error.message)
            return
          }
          setName('')
          router.refresh()
        })
      }}
    >
      <FormRow
        htmlFor="email-domain-name"
        label="Domain"
        required
        hint="The domain to send from, without a protocol or path."
      >
        <Input
          id="email-domain-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="mail.example.com"
          autoComplete="off"
          spellCheck={false}
          disabled={isPending}
          required
        />
      </FormRow>
      {error ? (
        <AppError
          variant="inline"
          error={{ code: 'email/add-failed', message: error }}
        />
      ) : null}
      <div>
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
