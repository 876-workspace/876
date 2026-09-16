'use client'

import { Button } from '@876/ui/button'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Portal reply form. Posts to the portal route family, which resolves the
 * client grant before recording anything under the portal user.
 */
export function PortalReplyForm({
  endpoint,
  label,
}: {
  endpoint: string
  label: string
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || !body.trim()) return
    setPending(true)
    setError(null)
    let response: Response | null = null
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      })
    } catch {
      setError('The reply could not be posted.')
      setPending(false)
      return
    }
    const payload = (await response.json().catch(() => null)) as {
      data?: unknown
      error?: { message?: string } | null
    } | null
    setPending(false)
    if (!response.ok || !payload?.data) {
      setError(payload?.error?.message ?? 'The reply could not be posted.')
      return
    }
    setBody('')
    router.refresh()
  }

  return (
    <form
      data-slot="portal-reply-form"
      onSubmit={submit}
      className="space-y-3"
    >
      <label htmlFor={`portal-reply-${label}`} className="text-sm font-medium">
        {label}
      </label>
      <Textarea
        id={`portal-reply-${label}`}
        value={body}
        disabled={pending}
        rows={4}
        required
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply…"
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !body.trim()}>
        {pending ? 'Posting…' : 'Reply'}
      </Button>
    </form>
  )
}
